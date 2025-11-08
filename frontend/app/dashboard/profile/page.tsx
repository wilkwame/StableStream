import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"

export default function ProfilePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-balance">Profile</h1>
        <p className="text-muted-foreground leading-relaxed text-pretty">
          Manage your profile information and account details
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="text-balance">Account Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col items-center text-center">
              <Avatar className="h-24 w-24 mb-4">
                <AvatarFallback className="text-2xl">JD</AvatarFallback>
              </Avatar>
              <h3 className="text-xl font-semibold text-balance">John Doe</h3>
              <p className="text-sm text-muted-foreground font-mono">0x742d...4e89</p>
              <Badge className="mt-2">Verified</Badge>
            </div>
            <Separator />
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Member Since</p>
                <p className="font-medium">January 2025</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Streams</p>
                <p className="font-medium">23 streams</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Volume</p>
                <p className="font-medium">$89,432.00</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-balance">Profile Information</CardTitle>
            <CardDescription className="leading-relaxed text-pretty">
              Update your profile information and contact details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name</Label>
                <Input id="displayName" placeholder="John Doe" defaultValue="John Doe" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ensName">ENS Name</Label>
                <Input id="ensName" placeholder="johndoe.eth" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input id="email" type="email" placeholder="john@example.com" />
              <p className="text-sm text-muted-foreground leading-relaxed">
                Used for notifications and account recovery
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Input id="bio" placeholder="Tell us about yourself" />
            </div>
            <div className="flex gap-3">
              <Button>Save Changes</Button>
              <Button variant="outline">Cancel</Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-balance">Recent Activity</CardTitle>
          <CardDescription className="leading-relaxed text-pretty">
            Your recent transactions and stream activity
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { action: "Created stream", recipient: "0x1234...5678", amount: "$5,000.00", time: "2 hours ago" },
              { action: "Paused stream", recipient: "0x8765...4321", amount: "$3,200.00", time: "5 hours ago" },
              { action: "Completed stream", recipient: "0x9876...1234", amount: "$10,000.00", time: "1 day ago" },
              { action: "Created stream", recipient: "0x4567...8901", amount: "$2,500.00", time: "2 days ago" },
            ].map((activity, i) => (
              <div key={i} className="flex items-center justify-between py-3 border-b last:border-0">
                <div className="space-y-1">
                  <p className="font-medium text-balance">{activity.action}</p>
                  <p className="text-sm text-muted-foreground font-mono">{activity.recipient}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium">{activity.amount}</p>
                  <p className="text-sm text-muted-foreground">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
