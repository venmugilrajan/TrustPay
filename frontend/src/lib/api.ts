let rawBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
if (rawBase.endsWith("/")) rawBase = rawBase.slice(0, -1);
export const API_BASE = rawBase.endsWith("/api") ? rawBase : `${rawBase}/api`;

export async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const cleanPath = url.startsWith("/") ? url : `/${url}`;
  const finalPath = cleanPath.startsWith("/api/") ? cleanPath.slice(4) : cleanPath;
  const fullUrl = url.startsWith("http") ? url : `${API_BASE}${finalPath}`;
  const res = await fetch(fullUrl, {
    ...options,
    headers: {
      "Accept": "application/json",
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

  return res.json();
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
  paypal_capture_id?: string;
  resubmission_count: number;
  acceptance_criteria: AcceptanceCriterion[];
  submissions: Submission[];
  disputes: DisputeRecord[];
}

export interface Contract {
  id: string;
  job_id: string;
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
  title: string;
  description: string;
  max_budget: number;
  currency: string;
  deadline: string;
  status: string;
  is_demo?: boolean;
  client_approved: boolean;
  freelancer_approved: boolean;
  paypal_order_id?: string;
  paypal_authorization_id?: string;
  paypal_status?: string;
  authorization_expires_at?: string;
  created_at: string;
  contract?: Contract;
  negotiation_turns?: NegotiationTurn[];
  audit_logs?: AuditLog[];
}

export interface SystemStats {
  total_jobs: number;
  active_jobs: number;
  completed_deals: number;
  total_authorized_usd: number;
  total_captured_usd: number;
  verified_milestones_count: number;
  live_paypal_connected: boolean;
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
  const fullUrl = `${API_BASE}/jobs/${jobId}/milestones/${milestoneId}/submit`;
  const res = await fetch(fullUrl, {
    method: "POST",
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

export async function getStats(): Promise<SystemStats> {
  return fetchJson<SystemStats>("/stats");
}

export async function seedDemo(): Promise<Job> {
  return fetchJson<Job>("/demo/seed", { method: "POST" });
}

export async function resetDemo(): Promise<any> {
  return fetchJson("/demo/reset", { method: "POST" });
}
