let rawBase = process.env.NEXT_PUBLIC_API_URL || "/api";
if (rawBase.endsWith("/")) rawBase = rawBase.slice(0, -1);
export const API_BASE = rawBase.endsWith("/api") ? rawBase : `${rawBase}/api`;

// Auth token storage helper with role-scoped isolation
const TOKEN_KEY = "trustpay_auth_token";

export function getStoredToken(role?: "client" | "freelancer"): string | null {
  if (typeof window === "undefined") return null;
  if (role) {
    return localStorage.getItem(`trustpay_${role}_token`) || localStorage.getItem(TOKEN_KEY);
  }
  const path = window.location.pathname;
  if (path.startsWith("/freelancer")) {
    return localStorage.getItem("trustpay_freelancer_token") || localStorage.getItem(TOKEN_KEY);
  }
  if (path.startsWith("/client")) {
    return localStorage.getItem("trustpay_client_token") || localStorage.getItem(TOKEN_KEY);
  }
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string, role?: "client" | "freelancer") {
  if (typeof window !== "undefined") {
    localStorage.setItem(TOKEN_KEY, token);
    if (role) {
      localStorage.setItem(`trustpay_${role}_token`, token);
    }
  }
}

export interface DemoUser {
  id: string;
  name: string;
  email: string;
  role: "client" | "freelancer";
  title?: string;
}

export const DEMO_USERS: DemoUser[] = [
  { id: "client_maya", name: "Maya Patel", email: "maya@technova.io", role: "client", title: "Founder, TechNova" },
  { id: "client_northwind", name: "Northwind Studio", email: "ops@northwind.design", role: "client", title: "Product Studio Lead" },
  { id: "freelancer_arjun", name: "Arjun Kumar", email: "arjun@freelance.dev", role: "freelancer", title: "Full-Stack & Systems Engineer" },
  { id: "freelancer_sofia", name: "Sofia Reyes", email: "sofia@cloudarch.io", role: "freelancer", title: "Backend & Data Pipeline Specialist" },
];

export function getStoredUser(role?: "client" | "freelancer"): DemoUser | null {
  if (typeof window === "undefined") return null;
  const key = role ? `trustpay_${role}_user` : "trustpay_current_user";
  const raw = localStorage.getItem(key);
  if (raw) {
    try { return JSON.parse(raw); } catch {}
  }
  return null;
}

export function setStoredUser(user: DemoUser) {
  if (typeof window !== "undefined") {
    localStorage.setItem("trustpay_current_user", JSON.stringify(user));
    localStorage.setItem(`trustpay_${user.role}_user`, JSON.stringify(user));
  }
}

export function clearUserSession() {
  if (typeof window !== "undefined") {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem("trustpay_client_token");
    localStorage.removeItem("trustpay_freelancer_token");
    localStorage.removeItem("trustpay_current_user");
    localStorage.removeItem("trustpay_client_user");
    localStorage.removeItem("trustpay_freelancer_user");
  }
}

export async function loginDemoUser(userId: string, role: "client" | "freelancer"): Promise<string> {
  const match = DEMO_USERS.find((u) => u.id === userId) || {
    id: userId,
    name: userId.includes("maya") ? "Maya Patel" : userId.includes("northwind") ? "Northwind Studio" : userId.includes("sofia") ? "Sofia Reyes" : "Arjun Kumar",
    email: `${userId}@trustpay.test`,
    role,
  };

  const res = await fetch(`${API_BASE}/demo-login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: match.id, role: match.role, name: match.name }),
  });
  if (!res.ok) throw new Error("Demo login failed");
  const data = await res.json();
  setStoredToken(data.access_token, role);
  setStoredUser({
    id: data.user_id,
    name: data.name,
    email: match.email,
    role: data.role as "client" | "freelancer",
    title: match.title,
  });
  invalidateApiCache();
  return data.access_token;
}

export async function ensureDemoUser(userId: string, role: "client" | "freelancer"): Promise<string> {
  const stored = getStoredUser(role);
  const existing = getStoredToken(role);
  if (existing && stored?.id === userId) return existing;
  invalidateApiCache();
  return loginDemoUser(userId, role);
}

// High-speed in-memory SWR cache for GET requests
const apiCache = new Map<string, { data: any; timestamp: number }>();

export function invalidateApiCache(prefix?: string) {
  if (!prefix) {
    apiCache.clear();
  } else {
    apiCache.forEach((_, key) => {
      if (key.includes(prefix)) {
        apiCache.delete(key);
      }
    });
  }
}

export async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const cleanPath = url.startsWith("/") ? url : `/${url}`;
  const finalPath = cleanPath.startsWith("/api/") ? cleanPath.slice(4) : cleanPath;
  const fullUrl = url.startsWith("http") ? url : `${API_BASE}${finalPath}`;

  let currentRole: "client" | "freelancer" | undefined;
  if (typeof window !== "undefined") {
    if (window.location.pathname.startsWith("/freelancer")) currentRole = "freelancer";
    else if (window.location.pathname.startsWith("/client")) currentRole = "client";
  }

  const token = getStoredToken(currentRole);
  const storedUser = getStoredUser(currentRole);
  const authHeaders: Record<string, string> = {};
  if (token) authHeaders["Authorization"] = `Bearer ${token}`;
  if (currentRole) authHeaders["X-User-Role"] = currentRole;
  if (storedUser?.id) authHeaders["X-User-Id"] = storedUser.id;

  const isGet = !options?.method || options.method.toUpperCase() === "GET";
  const cacheKey = `${fullUrl}_${token || ""}_${storedUser?.id || ""}_${currentRole || ""}`;

  // If cached and under 15 seconds old, return instantly (0ms)
  if (isGet && apiCache.has(cacheKey)) {
    const cached = apiCache.get(cacheKey)!;
    if (Date.now() - cached.timestamp < 15000) {
      // Background revalidate if older than 3 seconds
      if (Date.now() - cached.timestamp > 3000) {
        fetch(fullUrl, {
          ...options,
          headers: {
            "Accept": "application/json",
            ...authHeaders,
            ...(options?.headers || {}),
          },
        })
          .then((r) => (r.ok ? r.json() : null))
          .then((fresh) => {
            if (fresh) apiCache.set(cacheKey, { data: fresh, timestamp: Date.now() });
          })
          .catch(() => {});
      }
      return cached.data as T;
    }
  }

  const res = await fetch(fullUrl, {
    ...options,
    headers: {
      "Accept": "application/json",
      ...authHeaders,
      ...(options?.headers || {}),
    },
  });

  if (!res.ok) {
    const errorText = await res.text();
    let detail = errorText;
    try {
      const parsed = JSON.parse(errorText);
      if (Array.isArray(parsed.detail)) {
        detail = parsed.detail
          .map((d: any) => {
            const field = d.loc && Array.isArray(d.loc) ? d.loc[d.loc.length - 1] : "";
            const msg = d.msg || JSON.stringify(d);
            return field ? `${field}: ${msg}` : msg;
          })
          .join(". ");
      } else if (typeof parsed.detail === "object" && parsed.detail !== null) {
        detail = JSON.stringify(parsed.detail);
      } else if (parsed.detail) {
        detail = String(parsed.detail);
      }
    } catch {}
    throw new Error(detail || `HTTP ${res.status}`);
  }

  const data = await res.json();

  if (isGet) {
    apiCache.set(cacheKey, { data, timestamp: Date.now() });
  } else {
    // Invalidate cache on mutations (POST, PUT, DELETE)
    invalidateApiCache();
  }

  return data as T;
}

export interface AcceptanceCriterion {
  id: string;
  text: string;
  weight: number;
}

export interface CriterionResult {
  id?: string;
  text?: string;
  passed: boolean;
  score: number;
  reasoning: string;
  evidence: string;
}

export interface SandboxEvidence {
  exit_code?: number;
  stdout?: string;
  stderr?: string;
  tests_passed?: number;
  tests_total?: number;
  execution_time_ms?: number;
  success?: boolean;
  executed?: boolean;
  runner_mode?: string;
  provider?: string;
  needs_manual_review?: boolean;
  message?: string;
}

export interface JudgeEvaluation {
  id: string;
  submission_id?: string;
  overall_score: number;
  verdict: "pass" | "partial" | "fail";
  feedback_for_freelancer: string;
  per_criterion_results: CriterionResult[];
  sandbox_evidence?: SandboxEvidence;
  injection_detected: boolean;
  evaluated_at?: string;
}

export interface Submission {
  id: string;
  version: number;
  submission_type: string;
  file_path?: string;
  content_text?: string;
  submitted_at: string;
  evaluations?: JudgeEvaluation[];
}

export interface DisputeRecord {
  id: string;
  raised_by: "client" | "freelancer";
  reason: string;
  status: string;
  ruling?: string;
  amount_to_capture: number;
  amount_to_refund: number;
  reasoning?: string;
}

export interface Milestone {
  id: string;
  order_index: number;
  title: string;
  description: string;
  amount: number;
  due_date: string;
  status: string;
  captured_amount: number;
  paid_amount?: number;
  paypal_capture_id?: string;
  resubmission_count: number;
  acceptance_criteria: AcceptanceCriterion[];
  submissions: Submission[];
  disputes: DisputeRecord[];
}

export interface Contract {
  id: string;
  job_id: string;
  application_id?: string;
  total_amount: number;
  currency: string;
  deadline: string;
  status: string;
  milestones: Milestone[];
}

export interface NegotiationTurn {
  id: string;
  round_number: number;
  agent_role: "client" | "freelancer";
  message: string;
  proposal_summary: string;
  proposed_price?: number;
  price_change_reason?: string;
  contract_draft: any;
  agreed: boolean;
  timestamp: string;
}

export interface AuditLog {
  id: string;
  event_type: string;
  actor: string;
  details: Record<string, any>;
  timestamp: string;
}

export interface Job {
  id: string;
  client_id?: string;
  title: string;
  description: string;
  deliverables?: string;
  max_budget?: number | null;
  public_budget_estimate?: string;
  currency: string;
  deadline: string;
  priorities?: string;
  must_haves?: string;
  status: string;
  applications_count?: number;
  is_demo?: boolean;
  client_approved: boolean;
  freelancer_approved: boolean;
  paypal_order_id?: string;
  paypal_authorization_id?: string;
  paypal_status?: string;
  authorization_expires_at?: string;
  created_at: string;
  contract?: Contract;
  applications?: Application[];
  negotiation_turns?: NegotiationTurn[];
  audit_logs?: AuditLog[];
}

export interface SystemStats {
  total_jobs: number;
  active_jobs?: number;
  active_contracts?: number;
  completed_deals?: number;
  completed_contracts?: number;
  funds_held_escrow_usd?: number;
  released_payouts_usd?: number;
  total_authorized_usd?: number;
  total_captured_usd?: number;
  verified_milestones_count?: number;
  live_paypal_connected?: boolean;
}

// API Helper Methods
export async function getJobs(): Promise<Job[]> {
  return fetchJson<Job[]>("/jobs");
}

export async function getJob(id: string): Promise<Job> {
  return fetchJson<Job>(`/jobs/${id}`);
}

export async function createJob(data: {
  title: string;
  description: string;
  max_budget: number;
  public_budget_estimate?: string;
  currency?: string;
  deadline: string;
}): Promise<Job> {
  return fetchJson<Job>("/jobs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function stepNegotiation(id: string, runAll: boolean = false): Promise<any> {
  return fetchJson(`/jobs/${id}/negotiate?run_all=${runAll}`, { method: "POST" });
}

export async function approveContract(id: string, role: "client" | "freelancer"): Promise<any> {
  return fetchJson(`/jobs/${id}/approve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role }),
  });
}

export async function createFundOrder(id: string): Promise<{ order_id: string; approve_url?: string }> {
  return fetchJson(`/jobs/${id}/fund`, { method: "POST" });
}

export async function authorizePayment(id: string, orderId?: string, allowSandboxSimulation: boolean = true): Promise<any> {
  return fetchJson(`/jobs/${id}/authorize`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ order_id: orderId, allow_sandbox_simulation: allowSandboxSimulation }),
  });
}

export async function submitMilestoneWork(jobId: string, milestoneId: string, formData: FormData): Promise<any> {
  let token = getStoredToken("freelancer");
  if (!token) {
    token = await ensureDemoUser("freelancer_arjun", "freelancer");
  }
  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const fullUrl = `${API_BASE}/jobs/${jobId}/milestones/${milestoneId}/submit`;
  const res = await fetch(fullUrl, {
    method: "POST",
    headers,
    body: formData,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Failed to submit deliverable");
  }
  return res.json();
}

export async function fileDispute(
  jobId: string,
  milestoneId: string,
  data: { raised_by: "client" | "freelancer"; reason: string }
): Promise<any> {
  return fetchJson(`/jobs/${jobId}/milestones/${milestoneId}/dispute`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export interface ApplicationBrief {
  min_price?: number;
  preferred_price: number;
  time_needed_days: number;
  skills: string[];
  exclusions?: string;
  notes?: string;
}

export interface Application {
  id: string;
  job_id: string;
  freelancer_id: string;
  freelancer_name: string;
  min_price?: number;
  preferred_price: number;
  time_needed_days: number;
  skills: string[];
  exclusions?: string;
  notes?: string;
  status: "applied" | "negotiating" | "agreement_reached" | "no_deal" | "approved" | "funded" | "closed";
  client_approved: boolean;
  freelancer_approved: boolean;
  counters_used: number;
  created_at: string;
  updated_at: string;
  contract?: Contract;
  negotiation_turns?: NegotiationTurn[];
}

export async function createApplication(jobId: string, brief: {
  min_price: number;
  preferred_price: number;
  time_needed_days: number;
  skills: string | string[];
  exclusions?: string;
  notes?: string;
  freelancer_name?: string;
}): Promise<Application> {
  return fetchJson<Application>(`/jobs/${jobId}/applications`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(brief),
  });
}

export async function getJobApplications(jobId: string): Promise<Application[]> {
  return fetchJson<Application[]>(`/jobs/${jobId}/applications`);
}

export async function getApplication(applicationId: string): Promise<Application> {
  return fetchJson<Application>(`/applications/${applicationId}`);
}

export async function stepApplicationNegotiation(applicationId: string, runAll: boolean = false): Promise<any> {
  return fetchJson(`/applications/${applicationId}/negotiate?run_all=${runAll}`, { method: "POST" });
}

export async function decideApplication(
  applicationId: string,
  action: "accept" | "reject" | "counter",
  options?: { role?: "client" | "freelancer"; message?: string; counter_message?: string }
): Promise<any> {
  const currentRole =
    options?.role ||
    (typeof window !== "undefined" && window.location.pathname.startsWith("/freelancer")
      ? "freelancer"
      : "client");
  const msg = options?.message || options?.counter_message;
  return fetchJson(`/applications/${applicationId}/decide`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role: currentRole, action, message: msg }),
  });
}

export async function claimFundApplication(applicationId: string): Promise<{ order_id: string; approve_url?: string }> {
  return fetchJson(`/applications/${applicationId}/claim-fund`, { method: "POST" });
}

export async function confirmFundApplication(applicationId: string, orderId?: string, allowSandboxSimulation: boolean = true): Promise<any> {
  return fetchJson(`/applications/${applicationId}/confirm-fund`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ order_id: orderId, allow_sandbox_simulation: allowSandboxSimulation }),
  });
}

export async function cancelFundApplication(applicationId: string): Promise<any> {
  return fetchJson(`/applications/${applicationId}/cancel-fund`, { method: "POST" });
}

export async function getOpportunities(): Promise<any[]> {
  return fetchJson<any[]>("/opportunities");
}

export async function getOpportunity(jobId: string): Promise<any> {
  return fetchJson<any>(`/opportunities/${jobId}`);
}

export async function getFreelancerApplications(): Promise<any[]> {
  return fetchJson<any[]>("/freelancer/applications");
}

export async function getFreelancerContracts(): Promise<any[]> {
  return fetchJson<any[]>("/freelancer/contracts");
}

export async function getFreelancerEarnings(): Promise<any[]> {
  return fetchJson<any[]>("/freelancer/earnings");
}

export async function getClientPayments(): Promise<any[]> {
  return fetchJson<any[]>("/client/payments");
}

export async function getClientStats(): Promise<any> {
  return fetchJson<any>("/client/stats");
}

export async function getFreelancerStats(): Promise<any> {
  return fetchJson<any>("/freelancer/stats");
}

export async function getContractTimeline(contractId: string): Promise<any[]> {
  return fetchJson<any[]>(`/contracts/${contractId}/timeline`);
}

export async function reauthorizeContract(contractId: string): Promise<any> {
  return fetchJson(`/contracts/${contractId}/reauthorize`, { method: "POST" });
}

export async function getStats(): Promise<SystemStats> {
  return fetchJson<SystemStats>("/stats");
}

export async function seedDemo(): Promise<Job> {
  return fetchJson<Job>("/demo/seed", { method: "POST" });
}

export async function resetDemo(): Promise<any> {
  return fetchJson("/demo/reset", { method: "POST" });
}

export async function closeJob(jobId: string): Promise<{ id: string; status: string; message: string }> {
  return fetchJson<{ id: string; status: string; message: string }>(`/jobs/${jobId}/close`, {
    method: "POST",
  });
}

export async function closeApplication(appId: string): Promise<{ id: string; status: string; message: string }> {
  return fetchJson<{ id: string; status: string; message: string }>(`/applications/${appId}/close`, {
    method: "POST",
  });
}

export async function reviseJobBudget(
  jobId: string,
  data: { new_max_budget: number; new_public_estimate?: string }
): Promise<any> {
  invalidateApiCache();
  return fetchJson<any>(`/jobs/${jobId}/revise-budget`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}
