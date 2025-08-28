"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Receipt, ExternalLink } from "lucide-react"
import { format } from "date-fns"
import type { Invoice } from "@/lib/subscription-service"

interface BillingHistoryProps {
  invoices: Invoice[]
}

export function BillingHistory({ invoices }: BillingHistoryProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-primary/10 text-primary"
      case "open":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400"
      case "void":
        return "bg-muted text-muted-foreground"
      case "uncollectible":
        return "bg-destructive/10 text-destructive"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case "paid":
        return "Paid"
      case "open":
        return "Open"
      case "void":
        return "Void"
      case "uncollectible":
        return "Uncollectible"
      default:
        return status
    }
  }

  if (invoices.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Billing History
          </CardTitle>
          <CardDescription>Your payment history and invoices</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No billing history available</p>
            <p className="text-sm text-muted-foreground">Your invoices will appear here once you have a subscription</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Receipt className="h-5 w-5" />
          Billing History
        </CardTitle>
        <CardDescription>Your payment history and invoices</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.map((invoice) => (
              <TableRow key={invoice.id}>
                <TableCell>
                  <div>
                    <p className="font-medium">{format(new Date(invoice.created), "MMM d, yyyy")}</p>
                    {invoice.paidAt && (
                      <p className="text-xs text-muted-foreground">
                        Paid {format(new Date(invoice.paidAt), "MMM d, yyyy")}
                      </p>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <span className="font-medium">{invoice.planName}</span>
                </TableCell>
                <TableCell>
                  <span className="font-medium">
                    ${invoice.amount.toFixed(2)} {invoice.currency.toUpperCase()}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge className={getStatusColor(invoice.status)}>{getStatusText(invoice.status)}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" asChild>
                    <a href={invoice.invoiceUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View
                    </a>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
