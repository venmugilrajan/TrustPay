"use client";

import React, { useEffect, useRef, useState } from "react";
import { Lock, DollarSign, RefreshCw } from "lucide-react";
import { fetchJson } from "@/lib/api";

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
    // Check if script already exists
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
        setError("Could not load PayPal SDK script. Using direct authorization.");
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
            height: 40,
          },
          createOrder: async () => {
            const res = await fetchJson<{ order_id: string }>(`/jobs/${jobId}/fund`, {
              method: "POST",
            });
            return res.order_id;
          },
          onApprove: async (data: any) => {
            setLoading(true);
            try {
              await fetchJson(`/jobs/${jobId}/authorize`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ order_id: data.orderID }),
              });
              onAuthorized();
            } catch (err: any) {
              setError(err.message || "Failed to authorize PayPal order.");
            } finally {
              setLoading(false);
            }
          },
          onError: (err: any) => {
            console.error("PayPal Buttons error:", err);
            setError("PayPal checkout error. You can also use the direct authorize button below.");
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
      // 1. Create Order
      const fundRes = await fetchJson<{ order_id: string }>(`/jobs/${jobId}/fund`, {
        method: "POST",
      });
      // 2. Authorize Order
      await fetchJson(`/jobs/${jobId}/authorize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_id: fundRes.order_id }),
      });
      onAuthorized();
    } catch (err: any) {
      setError(err.message || "Direct authorization failed.");
    } finally {
      setManualProcessing(false);
    }
  };

  return (
    <div className="p-5 rounded-2xl bg-white dark:bg-[#131b2e] border border-blue-500/40 shadow-xl space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-[#0070BA]/10 flex items-center justify-center text-[#0070BA]">
            <Lock className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
              PayPal Orders v2 Authorization Escrow
            </h4>
            <p className="text-xs text-slate-400">
              Intent: <strong className="text-teal-400">AUTHORIZE</strong> (Holds ${totalAmount.toFixed(2)} USD in escrow)
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3 text-xs rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500">
          {error}
        </div>
      )}

      {/* Official PayPal JS SDK Button Container */}
      <div className="min-h-[44px]">
        {loading && (
          <div className="flex items-center justify-center py-2 text-xs text-slate-400 space-x-2">
            <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />
            <span>Loading PayPal JS SDK Checkout...</span>
          </div>
        )}
        <div ref={containerRef} id={`paypal-button-${jobId}`} />
      </div>

      {/* Fallback Direct Sandbox Button for Testing & Headless environments */}
      <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
        <span className="text-[11px] text-slate-400">Sandbox API Direct Mode:</span>
        <button
          onClick={handleDirectAuthorize}
          disabled={manualProcessing}
          className="px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-xl bg-gradient-to-r from-[#003087] to-[#0070BA] hover:from-[#002466] hover:to-[#005a96] text-white transition flex items-center space-x-1.5 shadow-md shadow-blue-500/10"
        >
          <DollarSign className="w-3.5 h-3.5" />
          <span>{manualProcessing ? "Authorizing in Sandbox..." : "Quick Sandbox Authorize"}</span>
        </button>
      </div>
    </div>
  );
}

