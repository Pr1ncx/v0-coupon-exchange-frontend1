"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, UserCheck, UserX, Edit, Crown, Shield } from "lucide-react"
import { adminService, type UserManagement } from "@/lib/admin-service"
import { useToast } from "@/hooks/use-toast"

export function UserManagementTable() {
  const [users, setUsers] = useState<UserManagement[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [selectedUser, setSelectedUser] = useState<UserManagement | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const { toast } = useToast()

  useEffect(() => {
    loadUsers()
  }, [page, search])

  const loadUsers = async () => {
    try {
      setLoading(true)
      const data = await adminService.getUsers(page, 20, search)
      setUsers(data.users)
      setTotalPages(data.totalPages)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load users",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleBanUser = async (userId: string) => {
    try {
      await adminService.banUser(userId)
      toast({
        title: "Success",
        description: "User has been banned",
      })
      loadUsers()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to ban user",
        variant: "destructive",
      })
    }
  }

  const handleUnbanUser = async (userId: string) => {
    try {
      await adminService.unbanUser(userId)
      toast({
        title: "Success",
        description: "User has been unbanned",
      })
      loadUsers()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to unban user",
        variant: "destructive",
      })
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">User Management</h2>
          <p className="text-muted-foreground">Manage platform users and their permissions</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Claims</TableHead>
                <TableHead>Points</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading
                ? [...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 bg-muted rounded-full animate-pulse"></div>
                          <div>
                            <div className="h-4 bg-muted rounded w-24 mb-1 animate-pulse"></div>
                            <div className="h-3 bg-muted rounded w-32 animate-pulse"></div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="h-4 bg-muted rounded w-16 animate-pulse"></div>
                      </TableCell>
                      <TableCell>
                        <div className="h-4 bg-muted rounded w-20 animate-pulse"></div>
                      </TableCell>
                      <TableCell>
                        <div className="h-4 bg-muted rounded w-12 animate-pulse"></div>
                      </TableCell>
                      <TableCell>
                        <div className="h-4 bg-muted rounded w-16 animate-pulse"></div>
                      </TableCell>
                      <TableCell>
                        <div className="h-4 bg-muted rounded w-20 animate-pulse"></div>
                      </TableCell>
                      <TableCell>
                        <div className="h-4 bg-muted rounded w-24 animate-pulse"></div>
                      </TableCell>
                    </TableRow>
                  ))
                : users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={`/api/placeholder/40/40`} />
                            <AvatarFallback>{user.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{user.username}</p>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                          {user.role === "admin" && <Shield className="h-3 w-3 mr-1" />}
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge variant={user.isActive ? "default" : "destructive"}>
                            {user.isActive ? "Active" : "Banned"}
                          </Badge>
                          {user.isPremium && (
                            <Badge variant="secondary">
                              <Crown className="h-3 w-3 mr-1" />
                              Premium
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{user.totalClaims}</TableCell>
                      <TableCell>{user.points.toLocaleString()}</TableCell>
                      <TableCell>{formatDate(user.createdAt)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm" onClick={() => setSelectedUser(user)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Edit User: {user.username}</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <label className="text-sm font-medium">Role</label>
                                  <Select defaultValue={user.role}>
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="user">User</SelectItem>
                                      <SelectItem value="admin">Admin</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="flex justify-end gap-2">
                                  <Button variant="outline">Cancel</Button>
                                  <Button>Save Changes</Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                          {user.isActive ? (
                            <Button variant="destructive" size="sm" onClick={() => handleBanUser(user.id)}>
                              <UserX className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Button variant="default" size="sm" onClick={() => handleUnbanUser(user.id)}>
                              <UserCheck className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      <div className="flex justify-center gap-2">
        <Button variant="outline" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
          Previous
        </Button>
        <span className="flex items-center px-4 text-sm text-muted-foreground">
          Page {page} of {totalPages}
        </span>
        <Button
          variant="outline"
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={page === totalPages}
        >
          Next
        </Button>
      </div>
    </div>
  )
}
