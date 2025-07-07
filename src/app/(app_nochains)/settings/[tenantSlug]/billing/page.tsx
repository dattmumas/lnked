import {
  CreditCard,
  Receipt,
  Package,
  Calendar,
  Download,
  TrendingUp,
  Users,
  DollarSign,
} from 'lucide-react';
import { notFound } from 'next/navigation';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export default async function TenantBillingPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}): Promise<React.ReactElement> {
  const { tenantSlug } = await params;
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    notFound();
  }

  // Fetch tenant and check user's access
  const { data: tenant } = await supabase
    .from('tenants')
    .select(
      `
      *,
      tenant_members!inner(
        user_id,
        role
      )
    `,
    )
    .eq('slug', tenantSlug)
    .eq('tenant_members.user_id', user.id)
    .single();

  if (!tenant) {
    notFound();
  }

  const userRole = tenant.tenant_members?.[0]?.role;
  const canManageBilling = userRole === 'owner' || userRole === 'admin';

  if (!canManageBilling) {
    notFound();
  }

  return (
    <>
      <header className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Billing & Subscription</h1>
        <p className="text-muted-foreground">
          Manage {tenant.name}'s subscription and billing information.
        </p>
      </header>

      <div className="space-y-6">
        {/* Revenue Overview */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Monthly Revenue
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">$1,234</div>
              <p className="text-xs text-muted-foreground">
                +12% from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Active Subscribers
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">42</div>
              <p className="text-xs text-muted-foreground">+3 new this month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Growth Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">+15%</div>
              <p className="text-xs text-muted-foreground">
                Compared to last month
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Subscription Plans */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                <CardTitle>Subscription Plans</CardTitle>
              </div>
              <Button>Create Plan</Button>
            </div>
            <CardDescription>
              Manage subscription tiers for your collective
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div>
                  <h4 className="font-semibold">Basic Membership</h4>
                  <p className="text-sm text-muted-foreground">
                    $5/month - Access to all content
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">12 subscribers</Badge>
                  <Button variant="outline" size="sm">
                    Edit
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div>
                  <h4 className="font-semibold">Premium Membership</h4>
                  <p className="text-sm text-muted-foreground">
                    $15/month - All content + exclusive perks
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">30 subscribers</Badge>
                  <Button variant="outline" size="sm">
                    Edit
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payout Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              <CardTitle>Payout Settings</CardTitle>
            </div>
            <CardDescription>
              Configure how you receive payments
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Stripe Connect Account</p>
                  <p className="text-sm text-muted-foreground">
                    Connected as acct_1234567890
                  </p>
                </div>
                <Button variant="outline">Manage</Button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Payout Schedule</p>
                  <p className="text-sm text-muted-foreground">
                    Weekly on Fridays
                  </p>
                </div>
                <Button variant="outline">Change</Button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Next Payout</p>
                  <p className="text-sm text-muted-foreground">
                    $892.50 on Dec 15, 2024
                  </p>
                </div>
                <Badge>Pending</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Transaction History */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              <CardTitle>Recent Transactions</CardTitle>
            </div>
            <CardDescription>
              Your collective's financial activity
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">
                        Subscription payment from user_{i}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(
                          Date.now() - i * 24 * 60 * 60 * 1000,
                        ).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-green-600">+$15.00</span>
                    <Button variant="ghost" size="sm">
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}

              <Button variant="outline" className="w-full">
                View All Transactions
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
