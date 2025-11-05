import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowUpRight, ArrowDownLeft, Copy } from "lucide-react"

export default function WalletPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-balance">Wallet</h1>
        <p className="text-muted-foreground leading-relaxed text-pretty">
          Manage your USDC balance and view transaction history
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-balance">USDC Balance</CardTitle>
            <CardDescription className="leading-relaxed">Your current balance</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-4xl font-bold">$45,231.89</p>
              <p className="text-sm text-muted-foreground">45,231.89 USDC</p>
            </div>
            <div className="flex gap-3">
              <Button className="flex-1">
                <ArrowDownLeft className="mr-2 h-4 w-4" />
                Deposit
              </Button>
              <Button variant="outline" className="flex-1 bg-transparent">
                <ArrowUpRight className="mr-2 h-4 w-4" />
                Withdraw
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-balance">Wallet Address</CardTitle>
            <CardDescription className="leading-relaxed">Your connected wallet</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-4">
              <p className="font-mono text-sm">0x742d35Cc6634C0532925a3b844Bc9e4e89</p>
              <Button variant="ghost" size="icon">
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Network</p>
                <p className="font-medium">Polygon</p>
              </div>
              <div>
                <p className="text-muted-foreground">Status</p>
                <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                  Connected
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-balance">Transaction History</CardTitle>
          <CardDescription className="leading-relaxed text-pretty">
            Recent deposits, withdrawals, and stream transactions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              {
                type: "Stream Created",
                amount: "-$5,000.00",
                address: "0x1234...5678",
                time: "2 hours ago",
                status: "completed",
              },
              {
                type: "Deposit",
                amount: "+$10,000.00",
                address: "0x8765...4321",
                time: "5 hours ago",
                status: "completed",
              },
              {
                type: "Stream Received",
                amount: "+$3,200.00",
                address: "0x9876...1234",
                time: "1 day ago",
                status: "completed",
              },
              {
                type: "Withdrawal",
                amount: "-$2,500.00",
                address: "0x4567...8901",
                time: "2 days ago",
                status: "completed",
              },
              {
                type: "Stream Created",
                amount: "-$8,000.00",
                address: "0x2345...6789",
                time: "3 days ago",
                status: "completed",
              },
            ].map((tx, i) => (
              <div key={i} className="flex items-center justify-between py-3 border-b last:border-0">
                <div className="flex items-center gap-4">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full ${
                      tx.amount.startsWith("+") ? "bg-green-500/10" : "bg-red-500/10"
                    }`}
                  >
                    {tx.amount.startsWith("+") ? (
                      <ArrowDownLeft className="h-5 w-5 text-green-500" />
                    ) : (
                      <ArrowUpRight className="h-5 w-5 text-red-500" />
                    )}
                  </div>
                  <div className="space-y-1">
                    <p className="font-medium text-balance">{tx.type}</p>
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
        </CardContent>
      </Card>
    </div>
  )
}
