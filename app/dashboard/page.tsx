"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowUpRight, ArrowDownRight, Waves, Users, DollarSign, TrendingUp, Plus, Upload } from "lucide-react"
import Link from "next/link"

const stats = [
  {
    title: "Active Streams",
    value: "23",
    change: "+4 from last month",
    trend: "up",
    icon: Waves,
  },
  {
    title: "Monthly Volume",
    value: "$89,432",
    change: "+15.3% from last month",
    trend: "up",
    icon: DollarSign,
  },
  {
    title: "Total Recipients",
    value: "156",
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
]

const recentActivity = [
  {
    id: 1,
    type: "stream_created",
    recipient: "john.eth",
    amount: "$5,000",
    time: "2 minutes ago",
  },
  {
    id: 2,
    type: "payment_completed",
    recipient: "sarah.eth",
    amount: "$2,500",
    time: "15 minutes ago",
  },
  {
    id: 3,
    type: "stream_paused",
    recipient: "mike.eth",
    amount: "$3,200",
    time: "1 hour ago",
  },
  {
    id: 4,
    type: "recipient_added",
    recipient: "emma.eth",
    amount: "-",
    time: "2 hours ago",
  },
]

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-balance">Dashboard</h1>
          <p className="text-muted-foreground leading-relaxed">Welcome back! Here's your payment streaming overview.</p>
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
        <Card>
          <CardHeader>
            <CardTitle>USDC Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="text-4xl font-bold">$45,231.89</div>
                <p className="text-sm text-muted-foreground">Available balance</p>
              </div>
              <div className="flex gap-2">
                <Button className="flex-1">Deposit</Button>
                <Button variant="outline" className="flex-1 bg-transparent">
                  Withdraw
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium leading-relaxed">{activity.recipient}</p>
                    <p className="text-xs text-muted-foreground">{activity.time}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{activity.amount}</p>
                    <p className="text-xs text-muted-foreground capitalize">{activity.type.replace("_", " ")}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
