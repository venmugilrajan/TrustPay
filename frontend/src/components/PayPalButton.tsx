"use client";

import React, { useEffect, useRef, useState } from "react";
import { Lock, RefreshCw, Zap } from "lucide-react";
import { fetchJson, authorizePayment, createFundOrder } from "@/lib/api";
import Button from "./ui/Button";

const PAYPAL_CLIENT_ID = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || "test";

interface PayPalButtonProps {
  jobId: string;
  totalAmount: number;
  currency?: string;
  onAuthorized: () => void;
}

declare global {
  interface Window {
    paypal?: any;
  }
}

export default function PayPalButton({
  jobId,
  totalAmount,
  currency = "USD",
  onAuthorized,
}: PayPalButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const [manualProcessing, setManualProcessing] = useState(false);

  useEffect(() => {
    const scriptId = "paypal-sdk-script";
    let script = document.getElementById(scriptId) as HTMLScriptElement;

    const onScriptLoaded = () => {
      setSdkLoaded(true);
      setLoading(false);
    };

    if (!script) {
      script = document.createElement("script");
      script.id = scriptId;
      script.src = `https://www.paypal.com/sdk/js?client-id=${PAYPAL_CLIENT_ID}&currency=${currency}&intent=authorize&components=buttons`;
      script.async = true;
      script.onload = onScriptLoaded;
      script.onerror = () => {
        setError("Could not load PayPal SDK script. You can use the Quick Sandbox Authorize button below.");
        setLoading(false);
      };
      document.body.appendChild(script);
    } else if (window.paypal) {
      onScriptLoaded();
    } else {
      script.addEventListener("load", onScriptLoaded);
    }
  }, [currency]);

  useEffect(() => {
    if (!sdkLoaded || !window.paypal || !containerRef.current) return;

    containerRef.current.innerHTML = "";

    try {
      window.paypal
        .Buttons({
          style: {
            layout: "horizontal",
            color: "gold",
            shape: "rect",
            label: "paypal",
            height: 42,
          },
          createOrder: async () => {
            setError(null);
            const res = await createFundOrder(jobId);
            return res.order_id;
          },
          onApprove: async (data: any) => {
            setLoading(true);
            try {
              await authorizePayment(jobId, data.orderID, false);
              onAuthorized();
            } catch (err: any) {
              setError(err.message || "Failed to authorize PayPal order.");
            } finally {
              setLoading(false);
            }
          },
          onError: (err: any) => {
            console.error("PayPal Buttons error:", err);
            setError("PayPal checkout error. You can use the Quick Sandbox Authorize button below.");
          },
        })
        .render(containerRef.current);
    } catch (err: any) {
      console.warn("PayPal render issue:", err);
    }
  }, [sdkLoaded, jobId, onAuthorized]);

  const handleDirectAuthorize = async () => {
    setManualProcessing(true);
    setError(null);
    try {
      const fundRes = await createFundOrder(jobId);
      await authorizePayment(jobId, fundRes.order_id, true);
      onAuthorized();
    } catch (err: any) {
      setError(err.message || "Direct authorization failed.");
    } finally {
      setManualProcessing(false);
    }
  };

  return (
    <div className="p-6 rounded-card bg-surface border border-border-subtle shadow-soft space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-btn bg-primary-subtle flex items-center justify-center text-primary">
            <Lock className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold font-serif text-content-primary">
              PayPal Orders v2 Escrow Authorization
            </h4>
            <p className="text-xs text-content-secondary">
              Holds <strong className="text-primary font-mono">${Number(totalAmount || 0).toFixed(2)} {currency}</strong> in escrow (intent: AUTHORIZE)
            </p>
          </div>
        </div>
      </div>

      <p className="text-xs text-content-secondary leading-relaxed bg-surface-subtle p-3 rounded-btn border border-border-subtle">
        Money is held safely by PayPal and only released to the freelancer when milestones pass AI Judge verification.
      </p>

      {error && (
        <div className="p-3 text-xs rounded-btn bg-warning-bg border border-warning-border text-warning">
          {error}
        </div>
      )}

      {/* Official PayPal JS SDK Button Container */}
      <div className="min-h-[44px]">
        {loading && (
          <div className="flex items-center justify-center py-3 text-xs text-content-muted gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-primary" />
            <span>Connecting to PayPal Sandbox Checkout...</span>
          </div>
        )}
        <div ref={containerRef} id={`paypal-button-${jobId}`} />
      </div>

      {/* Quick Sandbox Bypass for Instant Hackathon Evaluation */}
      <div className="pt-3 border-t border-border-subtle flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="text-[11px] text-content-muted">
          <span>Sandbox Fast-Track: </span>
          <span className="text-content-secondary">Bypass login popup during judging</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleDirectAuthorize}
          loading={manualProcessing}
          icon={<Zap className="w-3.5 h-3.5 text-accent" />}
        >
          Quick Sandbox Authorize
        </Button>
      </div>
    </div>
  );
}
