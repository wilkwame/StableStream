"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"

interface CreateStreamFormProps {
  onSuccess: () => void
}

export default function CreateStreamForm({ onSuccess }: CreateStreamFormProps) {
  const [formData, setFormData] = useState({
    recipient: "",
    amount: "",
    duration: "",
    durationType: "days",
    frequency: "continuous",
    startDate: "",
    notes: "",
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // API call would go here
    console.log("[v0] Creating stream:", formData)
    onSuccess()
  }

  const calculateRate = () => {
    const amount = Number.parseFloat(formData.amount) || 0
    const duration = Number.parseFloat(formData.duration) || 1
    const daysMultiplier = formData.durationType === "months" ? 30 : formData.durationType === "weeks" ? 7 : 1
    const totalDays = duration * daysMultiplier
    return (amount / totalDays).toFixed(2)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="recipient">Recipient</Label>
          <Select value={formData.recipient} onValueChange={(value) => setFormData({ ...formData, recipient: value })}>
            <SelectTrigger id="recipient">
              <SelectValue placeholder="Select recipient" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="john.eth">john.eth (0x1234...5678)</SelectItem>
              <SelectItem value="sarah.eth">sarah.eth (0x8765...4321)</SelectItem>
              <SelectItem value="mike.eth">mike.eth (0xabcd...efgh)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="amount">Total Amount (USDC)</Label>
            <Input
              id="amount"
              type="number"
              placeholder="5000"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
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
                <span className="font-medium">${calculateRate()} USDC</span>
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
        <Button type="submit" className="flex-1">
          Create Stream
        </Button>
        <Button type="button" variant="outline" onClick={onSuccess}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
