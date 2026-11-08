"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { CreditCard, Lock, CheckCircle2, RotateCcw, XCircle } from "lucide-react";
import {
  PageHeader,
  Card,
  DataTable,
  StatusChip,
  CopyableId,
  Skeleton,
  EmptyState,
} from "@/components/ui";
import { getJobs, Job, AuditLog } from "@/lib/api";

interface PaymentActivityItem {
  id: string;
  jobId: string;
  jobTitle: string;
  eventType: string;
  amount?: number;
  currency?: string;
  transactionId?: string;
  timestamp: string;
  details: Record<string, any>;
}

export default function ClientPaymentsPage() {
  const [activities, setActivities] = useState<PaymentActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPayments = async () => {
      try {
        const jobs = await getJobs();
        const items: PaymentActivityItem[] = [];

        jobs.forEach((job) => {
          if (job.audit_logs) {
            job.audit_logs.forEach((log) => {
              if (
                log.event_type.startsWith("PAYPAL_") ||
                log.event_type.includes("CAPTURE") ||
                log.event_type.includes("REFUND") ||
                log.event_type.includes("VOID") ||
                log.event_type.includes("AUTH")
              ) {
                items.push({
                  id: log.id,
                  jobId: job.id,
                  jobTitle: job.title,
                  eventType: log.event_type,
                  amount: log.details?.amount || log.details?.captured_amount || log.details?.refund_amount,
                  currency: log.details?.currency || "USD",
                  transactionId:
                    log.details?.authorization_id ||
                    log.details?.capture_id ||
                    log.details?.order_id ||
                    log.details?.refund_id,
                  timestamp: log.timestamp,
                  details: log.details,
                });
              }
            });
          }
        });

        // Sort descending by timestamp
        items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setActivities(items);
      } catch (err) {
        console.warn("Failed to load payment logs:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPayments();
  }, []);

  const formatEventType = (type: string) => {
    switch (type) {
      case "PAYPAL_ORDER_CREATED":
        return { label: "Order Created", chip: "in_progress", icon: <Lock className="w-3.5 h-3.5 text-primary" /> };
      case "PAYPAL_ORDER_AUTHORIZED":
        return { label: "Escrow Authorized", chip: "funded", icon: <Lock className="w-3.5 h-3.5 text-primary" /> };
      case "PAYPAL_PAYMENT_CAPTURED":
      case "PAYPAL_CAPTURE_COMPLETED":
        return { label: "Payment Released", chip: "paid", icon: <CheckCircle2 className="w-3.5 h-3.5 text-success" /> };
      case "PAYPAL_REFUND_EXECUTED":
        return { label: "Escrow Refunded", chip: "refunded", icon: <RotateCcw className="w-3.5 h-3.5 text-accent" /> };
      case "PAYPAL_AUTHORIZATION_VOIDED":
        return { label: "Escrow Voided", chip: "voided", icon: <XCircle className="w-3.5 h-3.5 text-content-muted" /> };
      default:
        return { label: type.replace(/_/g, " "), chip: "in_progress", icon: <CreditCard className="w-3.5 h-3.5" /> };
    }
  };

  const columns = [
    {
      header: "Event",
      cell: (row: PaymentActivityItem) => {
        const info = formatEventType(row.eventType);
        return (
          <div className="flex items-center gap-2">
            {info.icon}
            <span className="font-semibold text-content-primary">{info.label}</span>
          </div>
        );
      },
    },
    {
      header: "Project",
      cell: (row: PaymentActivityItem) => (
        <Link
          href={`/client/jobs/${row.jobId}`}
          className="text-xs text-primary hover:underline font-medium line-clamp-1 max-w-xs"
        >
          {row.jobTitle}
        </Link>
      ),
    },
    {
      header: "PayPal Reference ID",
      cell: (row: PaymentActivityItem) =>
        row.transactionId ? (
          <CopyableId idText={row.transactionId} />
        ) : (
          <span className="text-content-muted text-xs font-mono">—</span>
        ),
    },
    {
      header: "Amount",
      align: "right" as const,
      cell: (row: PaymentActivityItem) => (
        <span className="font-serif font-bold text-sm text-content-primary">
          {row.amount != null ? `$${parseFloat(String(row.amount)).toFixed(2)} ${row.currency}` : "—"}
        </span>
      ),
    },
    {
      header: "Timestamp",
      align: "right" as const,
      cell: (row: PaymentActivityItem) => (
        <span className="text-xs text-content-muted font-mono">
          {new Date(row.timestamp).toLocaleString()}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title="PayPal Escrow Activity"
        description="Immutable record of all PayPal Orders v2 authorizations, partial captures, voids, and dispute refunds."
        backHref="/client"
        backLabel="Back to Dashboard"
      />

      {loading ? (
        <div className="space-y-3">
          <Skeleton height={48} className="w-full" />
          <Skeleton height={64} className="w-full" />
          <Skeleton height={64} className="w-full" />
        </div>
      ) : activities.length === 0 ? (
        <EmptyState
          icon={<CreditCard className="w-6 h-6" />}
          title="No PayPal transactions recorded"
          description="When you authorize escrow funds or release milestone payments via PayPal, all transaction receipts appear here."
          actionLabel="View Active Contracts"
          actionHref="/client"
        />
      ) : (
        <DataTable columns={columns} data={activities} />
      )}
    </div>
  );
}
