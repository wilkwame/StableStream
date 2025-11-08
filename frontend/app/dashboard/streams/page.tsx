// app/dashboard/streams/page.tsx
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Plus, Search, Play, Pause, Square, MoreHorizontal, Loader2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import CreateStreamForm from "@/components/create-stream-form";
import { useAuth } from "@/lib/auth-context";
import { getSigner, getStreamFactory, getUSDC } from "@/lib/contracts";
import { ethers } from "ethers";

interface Stream {
  id: bigint;
  streamContract: string;
  employer: string;
  employee: string;
  depositAmount: bigint;
  amountPerSecond: bigint;
  startTime: bigint;
  stopTime: bigint;
  paused: boolean;
  withdrawn: bigint;
}

export default function StreamsPage() {
  const { user } = useAuth();
  const [filter, setFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [streams, setStreams] = useState<Stream[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    loadStreams();
    const interval = setInterval(loadStreams, 5000); // Refresh every 5s
    return () => clearInterval(interval);
  }, [user, filter, searchQuery]);

  const loadStreams = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const signer = await getSigner();
      const factory = await getStreamFactory(signer);
      const address = user.address;

      const filter = factory.filters.StreamCreated(null, address);
      const events = await factory.queryFilter(filter, 0, "latest");

      const streamPromises = events.map(async (e) => {
        const args = e.args as any;
        const streamContract = new ethers.Contract(
          args.streamContract,
          [
            "function balance() view returns (uint256)",
            "function withdrawn() view returns (uint256)",
            "function paused() view returns (bool)",
            "function pause()",
            "function resume()",
            "function cancel()"
          ],
          signer
        );

        const [balance, withdrawn, paused] = await Promise.all([
          streamContract.balance(),
          streamContract.withdrawn(),
          streamContract.paused()
        ]);

        return {
          id: args.streamId,
          streamContract: args.streamContract,
          employer: args.employer,
          employee: args.employee,
          depositAmount: args.depositAmount,
          amountPerSecond: args.amountPerSecond,
          startTime: args.startTime,
          stopTime: args.stopTime || 0n,
          paused,
          withdrawn,
          balance,
        };
      });

      const loadedStreams = await Promise.all(streamPromises);
      setStreams(loadedStreams);
    } catch (err) {
      console.error("Load streams error:", err);
    } finally {
      setLoading(false);
    }
  };

  const getStatus = (stream: Stream): { status: string; badge: "default" | "secondary" | "destructive" } => {
    if (stream.paused) return { status: "paused", badge: "secondary" };
    if (stream.balance === 0n && stream.withdrawn >= stream.depositAmount) return { status: "completed", badge: "secondary" };
    return { status: "active", badge: "default" };
  };

  const getProgress = (stream: Stream): number => {
    const total = Number(ethers.formatUnits(stream.depositAmount, 6));
    const streamed = Number(ethers.formatUnits(stream.withdrawn, 6));
    return total > 0 ? (streamed / total) * 100 : 0;
  };

  const getDuration = (stream: Stream): string => {
    const durationSec = stream.stopTime > 0n ? Number(stream.stopTime - stream.startTime) : 0;
    const days = Math.floor(durationSec / 86400);
    return days > 0 ? `${days} days` : "ongoing";
  };

  const handlePause = async (streamContract: string) => {
    setActionLoading(streamContract);
    try {
      const signer = await getSigner();
      const stream = new ethers.Contract(streamContract, ["function pause()"], signer);
      const tx = await stream.pause();
      await tx.wait();
      await loadStreams();
    } catch (err: any) {
      alert(err.reason || "Failed to pause");
    } finally {
      setActionLoading(null);
    }
  };

  const handleResume = async (streamContract: string) => {
    setActionLoading(streamContract);
    try {
      const signer = await getSigner();
      const stream = new ethers.Contract(streamContract, ["function resume()"], signer);
      const tx = await stream.resume();
      await tx.wait();
      await loadStreams();
    } catch (err: any) {
      alert(err.reason || "Failed to resume");
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async (streamContract: string) => {
    if (!confirm("Cancel stream? Recipient gets remaining funds.")) return;
    setActionLoading(streamContract);
    try {
      const signer = await getSigner();
      const stream = new ethers.Contract(streamContract, ["function cancel()"], signer);
      const tx = await stream.cancel();
      await tx.wait();
      await loadStreams();
    } catch (err: any) {
      alert(err.reason || "Failed to cancel");
    } finally {
      setActionLoading(null);
    }
  };

  const filteredStreams = streams.filter((stream) => {
    const { status } = getStatus(stream);
    const matchesFilter = filter === "all" || status === filter;
    const matchesSearch =
      stream.employee.toLowerCase().includes(searchQuery.toLowerCase()) ||
      stream.streamContract.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      active: "default",
      paused: "secondary",
      completed: "secondary",
    };
    return (
      <Badge variant={variants[status]} className="capitalize">
        {status}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between">
          <div className="h-8 w-32 bg-muted animate-pulse rounded" />
          <div className="h-10 w-32 bg-muted animate-pulse rounded" />
        </div>
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                {["Recipient", "Amount", "Progress", "Duration", "Status", "Actions"].map(h => (
                  <TableHead key={h}>{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {[1, 2, 3].map(i => (
                <TableRow key={i}>
                  <TableCell><div className="h-4 w-32 bg-muted animate-pulse rounded" /></TableCell>
                  <TableCell><div className="h-4 w-24 bg-muted animate-pulse rounded" /></TableCell>
                  <TableCell><div className="h-4 w-20 bg-muted animate-pulse rounded" /></TableCell>
                  <TableCell><div className="h-4 w-16 bg-muted animate-pulse rounded" /></TableCell>
                  <TableCell><div className="h-6 w-16 bg-muted animate-pulse rounded" /></TableCell>
                  <TableCell><div className="h-8 w-24 bg-muted animate-pulse rounded" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
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
            <CreateStreamForm onSuccess={() => { setIsCreateOpen(false); loadStreams(); }} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by address or ENS..."
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
            {filteredStreams.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No streams found
                </TableCell>
              </TableRow>
            ) : (
              filteredStreams.map((stream) => {
                const { status } = getStatus(stream);
                const progress = getProgress(stream);
                const total = Number(ethers.formatUnits(stream.depositAmount, 6));
                const streamed = Number(ethers.formatUnits(stream.withdrawn, 6));
                const rate = Number(ethers.formatUnits(stream.amountPerSecond, 6));

                return (
                  <TableRow key={stream.streamContract}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{stream.employee.slice(0, 8)}...{stream.employee.slice(-6)}</div>
                        <div className="text-sm text-muted-foreground font-mono">{stream.streamContract.slice(0, 8)}...</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">${streamed.toFixed(2)}</div>
                        <div className="text-sm text-muted-foreground">of ${total.toFixed(2)}</div>
                        <div className="text-xs text-muted-foreground">{rate.toFixed(6)}/sec</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-2">
                        <Progress value={progress} />
                        <div className="text-xs text-muted-foreground">{progress.toFixed(1)}%</div>
                      </div>
                    </TableCell>
                    <TableCell>{getDuration(stream)}</TableCell>
                    <TableCell>{getStatusBadge(status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {status === "active" && (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handlePause(stream.streamContract)}
                            disabled={actionLoading === stream.streamContract}
                          >
                            {actionLoading === stream.streamContract ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pause className="h-4 w-4" />}
                          </Button>
                        )}
                        {status === "paused" && (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleResume(stream.streamContract)}
                            disabled={actionLoading === stream.streamContract}
                          >
                            {actionLoading === stream.streamContract ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                          </Button>
                        )}
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleCancel(stream.streamContract)}
                          disabled={actionLoading === stream.streamContract}
                        >
                          {actionLoading === stream.streamContract ? <Loader2 className="h-4 w-4 animate-spin" /> : <Square className="h-4 w-4" />}
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
                            <DropdownMenuItem className="text-destructive" onClick={() => handleCancel(stream.streamContract)}>
                              Cancel Stream
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}