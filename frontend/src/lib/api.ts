const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

export async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const fullUrl = url.startsWith("http") ? url : `${API_BASE}${url.startsWith("/") ? "" : "/"}${url}`;
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
      detail = parsed.detail || detail;
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
  submissions: any[];
  disputes: any[];
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
