"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Search, Plus, Upload, Download, MoreHorizontal } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

const recipients = [
  {
    id: "1",
    address: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    ensName: "john.eth",
    label: "Employee - Engineering",
    totalReceived: "$45,230",
    activeStreams: 3,
    lastPayment: "2 hours ago",
  },
  {
    id: "2",
    address: "0x8ba1f109551bD432803012645Ac136ddd64DBA72",
    ensName: "sarah.eth",
    label: "Contractor - Design",
    totalReceived: "$28,500",
    activeStreams: 2,
    lastPayment: "5 hours ago",
  },
  {
    id: "3",
    address: "0xdD2FD4581271e230360230F9337D5c0430Bf44C0",
    ensName: "mike.eth",
    label: "Employee - Marketing",
    totalReceived: "$32,100",
    activeStreams: 1,
    lastPayment: "1 day ago",
  },
]

export default function RecipientsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)

  const filteredRecipients = recipients.filter(
    (recipient) =>
      recipient.ensName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      recipient.label?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      recipient.address.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-balance">Recipients</h1>
          <p className="text-muted-foreground leading-relaxed">Manage your payment recipients and contacts.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="bg-transparent">
            <Upload className="mr-2 h-4 w-4" />
            Import CSV
          </Button>
          <Button variant="outline" className="bg-transparent">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Recipient
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Recipient</DialogTitle>
                <DialogDescription className="leading-relaxed">
                  Add a new recipient to your contacts for easy payment streaming.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="address">Wallet Address or ENS</Label>
                  <Input id="address" placeholder="0x... or name.eth" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="label">Label (Optional)</Label>
                  <Input id="label" placeholder="e.g., Employee - Engineering" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} className="bg-transparent">
                  Cancel
                </Button>
                <Button onClick={() => setIsAddDialogOpen(false)}>Add Recipient</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>All Recipients</CardTitle>
              <CardDescription className="leading-relaxed">
                {filteredRecipients.length} recipient{filteredRecipients.length !== 1 ? "s" : ""} found
              </CardDescription>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search recipients..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Label</TableHead>
                  <TableHead>Total Received</TableHead>
                  <TableHead>Active Streams</TableHead>
                  <TableHead>Last Payment</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecipients.map((recipient) => (
                  <TableRow key={recipient.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{recipient.ensName}</div>
                        <div className="text-xs text-muted-foreground font-mono">
                          {recipient.address.slice(0, 6)}...{recipient.address.slice(-4)}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{recipient.label}</TableCell>
                    <TableCell className="font-medium">{recipient.totalReceived}</TableCell>
                    <TableCell>{recipient.activeStreams}</TableCell>
                    <TableCell className="text-muted-foreground">{recipient.lastPayment}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>View Details</DropdownMenuItem>
                          <DropdownMenuItem>Edit Label</DropdownMenuItem>
                          <DropdownMenuItem>Create Stream</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive">Remove</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
