"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BarChart3, TrendingUp, DollarSign, Users } from "lucide-react"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

const volumeData = [
  { date: "Jan 1", outgoing: 4000, incoming: 2400 },
  { date: "Jan 8", outgoing: 3000, incoming: 1398 },
  { date: "Jan 15", outgoing: 2000, incoming: 9800 },
  { date: "Jan 22", outgoing: 2780, incoming: 3908 },
  { date: "Jan 29", outgoing: 1890, incoming: 4800 },
  { date: "Feb 5", outgoing: 2390, incoming: 3800 },
  { date: "Feb 12", outgoing: 3490, incoming: 4300 },
]

const activityData = [
  { day: "Mon", streams: 12 },
  { day: "Tue", streams: 19 },
  { day: "Wed", streams: 15 },
  { day: "Thu", streams: 25 },
  { day: "Fri", streams: 22 },
  { day: "Sat", streams: 8 },
  { day: "Sun", streams: 5 },
]

const topRecipients = [
  { name: "john.eth", amount: "$45,230", percentage: 28 },
  { name: "sarah.eth", amount: "$28,500", percentage: 18 },
  { name: "mike.eth", amount: "$32,100", percentage: 20 },
  { name: "emma.eth", amount: "$19,800", percentage: 12 },
  { name: "alex.eth", amount: "$15,600", percentage: 10 },
]

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-balance">Analytics</h1>
        <p className="text-muted-foreground leading-relaxed">
          Track your payment streams and analyze spending patterns.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Volume</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$89,432</div>
            <p className="text-xs text-muted-foreground">+15.3% from last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg. Stream Size</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$3,888</div>
            <p className="text-xs text-muted-foreground">+8.2% from last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Recipients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">156</div>
            <p className="text-xs text-muted-foreground">+12 from last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Growth Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+24.5%</div>
            <p className="text-xs text-muted-foreground">vs. previous period</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="volume" className="space-y-4">
        <TabsList>
          <TabsTrigger value="volume">Volume</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="recipients">Recipients</TabsTrigger>
        </TabsList>

        <TabsContent value="volume" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Payment Volume</CardTitle>
              <CardDescription className="leading-relaxed">
                Outgoing and incoming payment streams over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <AreaChart data={volumeData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="outgoing" stackId="1" stroke="#3b82f6" fill="#3b82f6" />
                  <Area type="monotone" dataKey="incoming" stackId="1" stroke="#10b981" fill="#10b981" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Stream Activity</CardTitle>
              <CardDescription className="leading-relaxed">Number of active streams per day</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={activityData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="streams" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recipients" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Recipients</CardTitle>
              <CardDescription className="leading-relaxed">
                Recipients receiving the most payments this month
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topRecipients.map((recipient, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-medium">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">{recipient.name}</div>
                        <div className="h-2 w-full bg-muted rounded-full mt-2">
                          <div className="h-2 bg-primary rounded-full" style={{ width: `${recipient.percentage}%` }} />
                        </div>
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      <div className="font-medium">{recipient.amount}</div>
                      <div className="text-xs text-muted-foreground">{recipient.percentage}%</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
