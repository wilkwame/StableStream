// components/create-stream-form.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { getSigner, getStreamFactory, getUSDC } from "@/lib/contracts";
import { ethers } from "ethers";
import { useAuth } from "@/lib/auth-context";

interface CreateStreamFormProps {
  onSuccess: () => void;
}

export default function CreateStreamForm({ onSuccess }: CreateStreamFormProps) {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    recipient: "",
    amount: "",
    duration: "",
    durationType: "days",
    frequency: "continuous",
    startDate: "",
    notes: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const calculateRatePerSecond = () => {
    const amount = Number.parseFloat(formData.amount) || 0;
    const duration = Number.parseFloat(formData.duration) || 1;
    const daysMultiplier = formData.durationType === "months" ? 30 : formData.durationType === "weeks" ? 7 : 1;
    const totalSeconds = duration * daysMultiplier * 24 * 60 * 60;
    return amount / totalSeconds;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return alert("Connect wallet first");

    const ratePerSec = calculateRatePerSecond();
    if (ratePerSec <= 0) return setError("Invalid amount or duration");

    setLoading(true);
    setError("");

    try {
      const signer = await getSigner();
      const factory = await getStreamFactory(signer);
      const usdc = await getUSDC(signer);

      const amountWei = ethers.parseUnits(formData.amount, 6);
      const rateWei = ethers.parseUnits(ratePerSec.toFixed(18), 6); // 6 decimals

      // 1. Approve Treasury (via Factory)
      const approveTx = await usdc.approve(await factory.getAddress(), amountWei);
      await approveTx.wait();

      // 2. Create Stream
      const tx = await factory.createStream(
        formData.recipient,
        rateWei,
        amountWei
      );
      await tx.wait();

      alert(`Stream created! Rate: ${ratePerSec.toFixed(6)} USDC/sec`);
      onSuccess();
    } catch (err: any) {
      console.error("Create stream error:", err);
      setError(err.reason || err.message || "Transaction failed");
    } finally {
      setLoading(false);
    }
  };

  const calculateDailyRate = () => {
    const amount = Number.parseFloat(formData.amount) || 0;
    const duration = Number.parseFloat(formData.duration) || 1;
    const daysMultiplier = formData.durationType === "months" ? 30 : formData.durationType === "weeks" ? 7 : 1;
    const totalDays = duration * daysMultiplier;
    return (amount / totalDays).toFixed(2);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-md">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="recipient">Recipient Address</Label>
          <Input
            id="recipient"
            placeholder="0x..."
            value={formData.recipient}
            onChange={(e) => setFormData({ ...formData, recipient: e.target.value })}
            required
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="amount">Total Amount (USDC)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              placeholder="5000"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="startDate">Start Date</Label>
            <Input
              id="startDate"
              type="date"
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="duration">Duration</Label>
            <Input
              id="duration"
              type="number"
              placeholder="30"
              value={formData.duration}
              onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="durationType">Period</Label>
            <Select
              value={formData.durationType}
              onValueChange={(value) => setFormData({ ...formData, durationType: value })}
            >
              <SelectTrigger id="durationType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="days">Days</SelectItem>
                <SelectItem value="weeks">Weeks</SelectItem>
                <SelectItem value="months">Months</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="frequency">Payment Frequency</Label>
          <Select value={formData.frequency} onValueChange={(value) => setFormData({ ...formData, frequency: value })}>
            <SelectTrigger id="frequency">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="continuous">Continuous (Real-time)</SelectItem>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">Notes (Optional)</Label>
          <Textarea
            id="notes"
            placeholder="Add any notes or reference information..."
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          />
        </div>
      </div>

      <Card className="bg-muted">
        <CardContent className="pt-6">
          <div className="space-y-2">
            <h3 className="font-semibold">Payment Summary</h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Daily rate:</span>
                <span className="font-medium">${calculateDailyRate()} USDC</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Rate per second:</span>
                <span className="font-medium text-xs font-mono">
                  {calculateRatePerSecond().toFixed(8)} USDC/sec
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Estimated fees:</span>
                <span className="font-medium">$0.01</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="font-medium">Total:</span>
                <span className="font-bold">${formData.amount || "0"} USDC</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button type="submit" className="flex-1" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating...
            </>
          ) : (
            "Create Stream"
          )}
        </Button>
        <Button type="button" variant="outline" onClick={onSuccess} disabled={loading}>
          Cancel
        </Button>
      </div>
    </form>
  );
}