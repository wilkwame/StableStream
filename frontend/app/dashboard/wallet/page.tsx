// frontend/app/dashboard/wallet/page.tsx
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowUpRight, ArrowDownLeft, Copy, Wallet } from "lucide-react";
import { getSigner, getUSDC, getTreasury, getStreamFactory } from "@/lib/contracts";
import { ethers } from "ethers";

interface Transaction {
  type: string;
  amount: string;
  address: string;
  time: string;
  status: "completed" | "pending";
}

export default function WalletPage() {
  const [account, setAccount] = useState<string | null>(null);
  const [usdcBalance, setUsdcBalance] = useState<string>("0");
  const [treasuryBalance, setTreasuryBalance] = useState<string>("0");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);

  const connectWallet = async () => {
    setConnecting(true);
    try {
      const signer = await getSigner();
      const address = await signer.getAddress();
      setAccount(address);
      loadData(signer, address);
    } catch (err: any) {
      alert(err.message || "Failed to connect");
    } finally {
      setConnecting(false);
    }
  };

  const loadData = async (signer: ethers.Signer, address: string) => {
    setLoading(true);
    try {
      const [usdc, treasury, factory] = await Promise.all([
        getUSDC(signer),
        getTreasury(signer),
        getStreamFactory(signer)
      ]);

      // USDC Balance
      const usdcBal = await usdc.balanceOf(address);
      setUsdcBalance(ethers.formatUnits(usdcBal, 6));

      // Treasury Balance
      const treasBal = await treasury.availableBalance(address);
      setTreasuryBalance(ethers.formatUnits(treasBal, 6));

      // Transaction History (from events)
      const filterCreated = factory.filters.StreamCreated(null, address);
      const filterReceived = factory.filters.StreamCreated(null, null, null, null, null, null, null, address);
      const filterWithdrawn = treasury.filters.Withdrawn(address);
      const filterDeposited = treasury.filters.Deposited(address);

      const [created, received, withdrawn, deposited] = await Promise.all([
        factory.queryFilter(filterCreated, -10000),
        factory.queryFilter(filterReceived, -10000),
        treasury.queryFilter(filterWithdrawn, -10000),
        treasury.queryFilter(filterDeposited, -10000)
      ]);

      const txs: Transaction[] = [];

      created.forEach(e => {
        const deposit = ethers.formatUnits(e.args.depositAmount, 6);
        txs.push({
          type: "Stream Created",
          amount: `-${deposit}`,
          address: e.args.streamContract.slice(0, 8) + "...",
          time: formatTime(e.blockNumber),
          status: "completed"
        });
      });

      received.forEach(e => {
        const rate = ethers.formatUnits(e.args.amountPerSecond, 6);
        txs.push({
          type: "Stream Received",
          amount: `+${rate}/sec`,
          address: e.args.streamContract.slice(0, 8) + "...",
          time: formatTime(e.blockNumber),
          status: "completed"
        });
      });

      withdrawn.forEach(e => {
        const amount = ethers.formatUnits(e.args.amount, 6);
        txs.push({
          type: "Withdrawal",
          amount: `-${amount}`,
          address: "Treasury",
          time: formatTime(e.blockNumber),
          status: "completed"
        });
      });

      deposited.forEach(e => {
        const amount = ethers.formatUnits(e.args.amount, 6);
        txs.push({
          type: "Deposit",
          amount: `+${amount}`,
          address: "Treasury",
          time: formatTime(e.blockNumber),
          status: "completed"
        });
      });

      txs.sort((a, b) => b.time.localeCompare(a.time)).slice(0, 10);
      setTransactions(txs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (block: number) => {
    // Simplified — in production, use block timestamp
    return "just now";
  };

  const deposit = async () => {
    if (!account) return;
    const amount = prompt("Enter USDC amount to deposit:");
    if (!amount) return;

    try {
      const signer = await getSigner();
      const usdc = await getUSDC(signer);
      const treasury = await getTreasury(signer);

      const amt = ethers.parseUnits(amount, 6);
      await (await usdc.approve(await treasury.getAddress(), amt)).wait();
      await (await treasury.deposit(amt)).wait();
      alert("Deposited!");
      loadData(signer, account);
    } catch (err: any) {
      alert(err.reason || err.message);
    }
  };

  const withdraw = async () => {
    if (!account) return;
    const amount = prompt("Enter USDC amount to withdraw:");
    if (!amount) return;

    try {
      const signer = await getSigner();
      const treasury = await getTreasury(signer);
      const amt = ethers.parseUnits(amount, 6);
      await (await treasury.withdraw(amt)).wait();
      alert("Withdrawn!");
      loadData(signer, account);
    } catch (err: any) {
      alert(err.reason || err.message);
    }
  };

  if (!account) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Button onClick={connectWallet} disabled={connecting} size="lg">
          <Wallet className="mr-2 h-5 w-5" />
          {connecting ? "Connecting..." : "Connect Wallet"}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Wallet</h1>
        <p className="text-muted-foreground">Manage your USDC and stream payments</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>USDC Balance</CardTitle>
            <CardDescription>Your wallet balance</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <Skeleton className="h-12 w-32" />
            ) : (
              <>
                <p className="text-4xl font-bold">${parseFloat(usdcBalance).toFixed(2)}</p>
                <p className="text-sm text-muted-foreground">{usdcBalance} USDC</p>
              </>
            )}
            <div className="flex gap-3">
              <Button onClick={deposit} className="flex-1">
                <ArrowDownLeft className="mr-2 h-4 w-4" /> Deposit
              </Button>
              <Button onClick={withdraw} variant="outline" className="flex-1">
                <ArrowUpRight className="mr-2 h-4 w-4" /> Withdraw
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Treasury Balance</CardTitle>
            <CardDescription>Funds available for streams</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <Skeleton className="h-12 w-32" />
            ) : (
              <>
                <p className="text-4xl font-bold">${parseFloat(treasuryBalance).toFixed(2)}</p>
                <p className="text-sm text-muted-foreground">{treasuryBalance} USDC</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>Recent blockchain activity</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : transactions.length === 0 ? (
            <p className="text-center text-muted-foreground">No transactions yet</p>
          ) : (
            <div className="space-y-4">
              {transactions.map((tx, i) => (
                <div key={i} className="flex items-center justify-between py-3 border-b last:border-0">
                  <div className="flex items-center gap-4">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-full ${
                      tx.amount.startsWith("+") ? "bg-green-500/10" : "bg-red-500/10"
                    }`}>
                      {tx.amount.startsWith("+") ? (
                        <ArrowDownLeft className="h-5 w-5 text-green-500" />
                      ) : (
                        <ArrowUpRight className="h-5 w-5 text-red-500" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{tx.type}</p>
                      <p className="text-sm text-muted-foreground font-mono">{tx.address}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-medium ${tx.amount.startsWith("+") ? "text-green-500" : "text-red-500"}`}>
                      {tx.amount}
                    </p>
                    <p className="text-sm text-muted-foreground">{tx.time}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}