"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { CreditCard, Lock, CheckCircle2, RotateCcw, XCircle, ArrowLeft, Shield } from "lucide-react";
import {
  StatCard,
  DataTable,
  StatusChip,
  Skeleton,
  EmptyState,
} from "@/components/ui";
import GlassButton from "@/components/glass/GlassButton";
import { getClientPayments, getClientStats } from "@/lib/api";

interface PaymentEntry {
  id: string;
  job_id: string;
  contract_id?: string;
  milestone_id?: string;
  type: string;
  amount: number;
  currency: string;
  paypal_id?: string;
  actor: string;
  note?: string;
  is_demo?: boolean;
  source?: string;
  created_at: string;
}

export default function ClientPaymentsPage() {
  const [entries, setEntries] = useState<PaymentEntry[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPayments = async () => {
      try {
        const [paymentList, statsData] = await Promise.all([
          getClientPayments(),
          getClientStats().catch(() => null),
        ]);
        setEntries(paymentList || []);
        setStats(statsData);
      } catch (err) {
        console.warn("Failed to load payment ledger:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPayments();
  }, []);

  const formatEntryType = (type: string) => {
    switch (type.toLowerCase()) {
      case "authorized":
        return {
          label: "Money Held Safely",
          chip: "funded",
          icon: <Lock className="w-4 h-4 text-accent-emerald" />,
        };
      case "captured":
        return {
          label: "Payment Released",
          chip: "paid",
          icon: <CheckCircle2 className="w-4 h-4 text-accent" />,
        };
      case "refunded":
        return {
          label: "Payment Returned",
          chip: "refunded",
          icon: <RotateCcw className="w-4 h-4 text-warning" />,
        };
      case "voided":
        return {
          label: "Safe Hold Voided",
          chip: "voided",
          icon: <XCircle className="w-4 h-4 text-content-muted" />,
        };
      default:
        return {
          label: type,
          chip: "in_progress",
          icon: <CreditCard className="w-4 h-4 text-content-muted" />,
        };
    }
  };

  // Correct field mapping from stats service single source of truth
  const heldInSafeHold =
    stats?.funds_held_escrow_usd ?? stats?.held_in_escrow_usd ?? 0;
  const released =
    stats?.released_to_freelancers_usd ?? stats?.total_released_usd ?? 0;
  const refunded = stats?.total_refunded_usd ?? 0;

  const columns = [
    {
      header: "Action & Context",
      cell: (row: PaymentEntry) => {
        const t = formatEntryType(row.type);
        const isDemo = row.is_demo || row.source === "demo";
        return (
          <div className="space-y-1">
            <div className="flex items-center gap-2 font-semibold text-content-primary">
              {t.icon}
              <span>{t.label}</span>
              {isDemo && <StatusChip status="demo_data" className="scale-75" />}
            </div>
            <p className="text-xs text-content-secondary line-clamp-1">
              {row.note || `Transaction for contract ${row.contract_id?.slice(0, 8)}...`}
            </p>
          </div>
        );
      },
    },
    {
      header: "Status",
      cell: (row: PaymentEntry) => {
        const t = formatEntryType(row.type);
        return <StatusChip status={t.chip} role="client" />;
      },
    },
    {
      header: "Amount",
      align: "right" as const,
      cell: (row: PaymentEntry) => (
        <div className="text-right">
          <span className="font-serif font-bold text-sm text-content-primary">
            ${Number(row.amount).toFixed(2)}
          </span>
          <span className="text-[10px] text-content-muted block">{row.currency || "USD"}</span>
        </div>
      ),
    },
    {
      header: "PayPal Reference ID",
      align: "right" as const,
      cell: (row: PaymentEntry) => (
        <span className="font-mono text-xs text-content-muted">
          {row.paypal_id || "N/A"}
        </span>
      ),
    },
    {
      header: "Recorded At",
      align: "right" as const,
      cell: (row: PaymentEntry) => (
        <span className="text-xs text-content-muted">
          {row.created_at ? new Date(row.created_at).toLocaleDateString("en-US", {
            day: "numeric",
            month: "short",
            year: "numeric",
          }) : "Recent"}
        </span>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in-up">
        <Skeleton className="h-8 w-48 rounded-xl" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
        </div>
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Header */}
      <div>
        <Link
          href="/client"
          className="inline-flex items-center gap-1.5 text-xs text-content-muted hover:text-content-primary transition-colors mb-3"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Dashboard</span>
        </Link>
        <h1 className="text-2xl sm:text-3xl font-bold font-serif text-content-primary tracking-tight">
          Payments & Safe Hold Ledger
        </h1>
        <p className="text-sm text-content-secondary mt-1">
          Every financial transaction is authorized via PayPal Orders v2 APIs and recorded in this immutable audit ledger.
        </p>
      </div>

      {/* 3 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <StatCard
          label="Held in Safe Hold"
          value={`$${Number(heldInSafeHold).toFixed(2)}`}
          subtext="Active authorizations waiting on milestone proof"
          icon={<Lock className="w-4 h-4 text-accent-emerald" />}
        />
        <StatCard
          label="Released to Freelancers"
          value={`$${Number(released).toFixed(2)}`}
          subtext="Successfully captured payouts for passed work"
          icon={<CheckCircle2 className="w-4 h-4 text-accent" />}
        />
        <StatCard
          label="Returned / Refunded"
          value={`$${Number(refunded).toFixed(2)}`}
          subtext="Returned safely to client PayPal account"
          icon={<RotateCcw className="w-4 h-4 text-warning" />}
        />
      </div>

      {/* Solid Table for Legibility */}
      <div className="content-solid p-6 shadow-soft space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div>
            <h2 className="text-lg font-bold font-serif text-content-primary">
              Immutable Financial Records
            </h2>
            <p className="text-xs text-content-secondary mt-0.5">
              Auditable records verified against live PayPal Sandbox ledger.
            </p>
          </div>
          <span className="text-xs text-content-muted font-medium">
            {entries.length} entries recorded
          </span>
        </div>

        {entries.length === 0 ? (
          <EmptyState
            title="No ledger entries found"
            description="When contracts are funded or payouts are released, transaction records will appear here."
          />
        ) : (
          <div className="overflow-x-auto">
            <DataTable
              columns={columns}
              data={entries}
            />
          </div>
        )}
      </div>
    </div>
  );
}
