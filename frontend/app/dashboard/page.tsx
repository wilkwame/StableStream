// app/dashboard/page.tsx
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, ArrowDownRight, Waves, Users, DollarSign, TrendingUp, Plus, Upload } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { getSigner, getUSDC, getTreasury, getStreamFactory } from "@/lib/contracts";
import { ethers } from "ethers";

interface Stat {
  title: string;
  value: string;
  change: string;
  trend: "up" | "down";
  icon: any;
}

interface Activity {
  id: number;
  type: string;
  recipient: string;
  amount: string;
  time: string;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stat[]>([]);
  const [usdcBalance, setUsdcBalance] = useState("0");
  const [treasuryBalance, setTreasuryBalance] = useState("0");
  const [recentActivity, setRecentActivity] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [depositing, setDepositing] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadDashboardData();
  }, [user]);

  const loadDashboardData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const signer = await getSigner();
      const address = user.address;

      const [usdc, treasury, factory] = await Promise.all([
        getUSDC(signer),
        getTreasury(signer),
        getStreamFactory(signer),
      ]);

      // === BALANCES ===
      const [usdcBal, treasBal] = await Promise.all([
        usdc.balanceOf(address),
        treasury.availableBalance(address),
      ]);
      setUsdcBalance(ethers.formatUnits(usdcBal, 6));
      setTreasuryBalance(ethers.formatUnits(treasBal, 6));

      // === STREAM COUNT ===
      const count = await factory.nextStreamId();
      const activeCount = count.toString();

      // === MONTHLY VOLUME (last 30 days) ===
      const thirtyDaysAgo = Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60;
      const createdFilter = factory.filters.StreamCreated(null, address);
      const createdEvents = await factory.queryFilter(createdFilter, 0, "latest");
      const monthlyVolume = createdEvents
        .filter(e => Number(e.args.startTime || 0) >= thirtyDaysAgo)
        .reduce((sum, e) => sum + Number(ethers.formatUnits(e.args.depositAmount, 6)), 0);

      // === RECENT ACTIVITY ===
      const activities: Activity[] = [];
      let id = 1;

      // Stream Created
      for (const e of createdEvents.slice(0, 3)) {
        const args = e.args as any;
        activities.push({
          id: id++,
          type: "stream_created",
          recipient: args.employee.slice(0, 8) + "...",
          amount: `$${ethers.formatUnits(args.depositAmount, 6)}`,
          time: "just now",
        });
      }

      // Add more from treasury events if needed
      setRecentActivity(activities);

      // === STATS ===
      setStats([
        {
          title: "Active Streams",
          value: activeCount,
          change: "+4 from last month",
          trend: "up",
          icon: Waves,
        },
        {
          title: "Monthly Volume",
          value: `$${monthlyVolume.toFixed(0)}`,
          change: "+15.3% from last month",
          trend: "up",
          icon: DollarSign,
        },
        {
          title: "Total Recipients",
          value: "156", // Can be enhanced
          change: "+12 from last month",
          trend: "up",
          icon: Users,
        },
        {
          title: "Fees Saved",
          value: "$2,341",
          change: "vs traditional payments",
          trend: "up",
          icon: TrendingUp,
        },
      ]);
    } catch (err) {
      console.error("Dashboard load error:", err);
    } finally {
      setLoading(false);
    }
  };

  // DEPOSIT FUNCTION
  const depositToTreasury = async () => {
    const input = prompt("Enter USDC amount to deposit:", "10");
    if (!input) return;
    const amount = parseFloat(input);
    if (isNaN(amount) || amount <= 0) return alert("Invalid amount");

    setDepositing(true);
    try {
      const signer = await getSigner();
      const usdc = await getUSDC(signer);
      const treasury = await getTreasury(signer);

      const amt = ethers.parseUnits(amount.toString(), 6);

      // 1. Approve
      const approveTx = await usdc.approve(await treasury.getAddress(), amt);
      await approveTx.wait();

      // 2. Deposit
      const depositTx = await treasury.deposit(amt);
      await depositTx.wait();

      alert(`Deposited ${amount} USDC to Treasury!`);
      await loadDashboardData(); // Refresh
    } catch (err: any) {
      alert(err.reason || err.message || "Transaction failed");
    } finally {
      setDepositing(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <div className="h-4 w-24 bg-muted animate-pulse rounded" />
              </CardHeader>
              <CardContent>
                <div className="h-8 w-32 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-balance">Dashboard</h1>
          <p className="text-muted-foreground leading-relaxed">
            Welcome back, {user?.ensName || `${user?.address.slice(0, 6)}...${user?.address.slice(-4)}`}!
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link href="/dashboard/streams/new">
              <Plus className="mr-2 h-4 w-4" />
              New Stream
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/dashboard/recipients">
              <Upload className="mr-2 h-4 w-4" />
              Add Recipient
            </Link>
          </Button>
        </div>
      </div>

      {/* STATS */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                {stat.trend === "up" ? (
                  <ArrowUpRight className="h-3 w-3 text-green-500" />
                ) : (
                  <ArrowDownRight className="h-3 w-3 text-red-500" />
                )}
                {stat.change}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* USDC + TREASURY BALANCE */}
        <Card>
          <CardHeader>
            <CardTitle>USDC Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="text-4xl font-bold">${parseFloat(usdcBalance).toFixed(2)}</div>
                <p className="text-sm text-muted-foreground">Wallet balance</p>
              </div>
              <div>
                <div className="text-2xl font-semibold">${parseFloat(treasuryBalance).toFixed(2)}</div>
                <p className="text-sm text-muted-foreground">Treasury (for streams)</p>
              </div>
              <div className="flex gap-2">
                <Button onClick={depositToTreasury} disabled={depositing} className="flex-1">
  {depositing ? "Depositing..." : "Deposit"}
</Button>
                <Button variant="outline" asChild className="flex-1 bg-transparent">
                  <Link href="/dashboard/wallet">Withdraw</Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* RECENT ACTIVITY */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No activity yet</p>
              ) : (
                recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium leading-relaxed">{activity.recipient}</p>
                      <p className="text-xs text-muted-foreground">{activity.time}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{activity.amount}</p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {activity.type.replace("_", " ")}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}