"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Plus, Search, Play, Pause, Square, MoreHorizontal } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import CreateStreamForm from "@/components/create-stream-form"

const streams = [
  {
    id: 1,
    recipient: "john.eth",
    recipientAddress: "0x1234...5678",
    amount: 5000,
    streamed: 3250,
    duration: "30 days",
    status: "active",
    startDate: "2025-01-01",
  },
  {
    id: 2,
    recipient: "sarah.eth",
    recipientAddress: "0x8765...4321",
    amount: 2500,
    streamed: 2500,
    duration: "15 days",
    status: "completed",
    startDate: "2024-12-15",
  },
  {
    id: 3,
    recipient: "mike.eth",
    recipientAddress: "0xabcd...efgh",
    amount: 3200,
    streamed: 1600,
    duration: "20 days",
    status: "paused",
    startDate: "2025-01-05",
  },
]

export default function StreamsPage() {
  const [filter, setFilter] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [isCreateOpen, setIsCreateOpen] = useState(false)

  const filteredStreams = streams.filter((stream) => {
    const matchesFilter = filter === "all" || stream.status === filter
    const matchesSearch =
      stream.recipient.toLowerCase().includes(searchQuery.toLowerCase()) ||
      stream.recipientAddress.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesFilter && matchesSearch
  })

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      active: "default",
      paused: "secondary",
      completed: "secondary",
    }
    return (
      <Badge variant={variants[status]} className="capitalize">
        {status}
      </Badge>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-balance">Streams</h1>
          <p className="text-muted-foreground leading-relaxed">Manage your active payment streams</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Stream
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Stream</DialogTitle>
            </DialogHeader>
            <CreateStreamForm onSuccess={() => setIsCreateOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search streams..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Streams</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="paused">Paused</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Recipient</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Progress</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredStreams.map((stream) => (
              <TableRow key={stream.id}>
                <TableCell>
                  <div>
                    <div className="font-medium">{stream.recipient}</div>
                    <div className="text-sm text-muted-foreground font-mono">{stream.recipientAddress}</div>
                  </div>
                </TableCell>
                <TableCell>
                  <div>
                    <div className="font-medium">${stream.streamed.toLocaleString()}</div>
                    <div className="text-sm text-muted-foreground">of ${stream.amount.toLocaleString()}</div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="space-y-2">
                    <Progress value={(stream.streamed / stream.amount) * 100} />
                    <div className="text-xs text-muted-foreground">
                      {Math.round((stream.streamed / stream.amount) * 100)}%
                    </div>
                  </div>
                </TableCell>
                <TableCell>{stream.duration}</TableCell>
                <TableCell>{getStatusBadge(stream.status)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    {stream.status === "active" && (
                      <Button size="icon" variant="ghost">
                        <Pause className="h-4 w-4" />
                      </Button>
                    )}
                    {stream.status === "paused" && (
                      <Button size="icon" variant="ghost">
                        <Play className="h-4 w-4" />
                      </Button>
                    )}
                    <Button size="icon" variant="ghost">
                      <Square className="h-4 w-4" />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="ghost">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>View Details</DropdownMenuItem>
                        <DropdownMenuItem>Edit Stream</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">Cancel Stream</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
