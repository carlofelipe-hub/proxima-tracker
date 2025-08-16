"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { redirect } from "next/navigation"
import { WalletType } from "@prisma/client"
import { SidebarNav } from "@/components/navigation/sidebar-nav"
import { WalletCard } from "@/components/wallets/wallet-card"
import { AddWalletForm } from "@/components/wallets/add-wallet-form"
import { EditWalletForm } from "@/components/wallets/edit-wallet-form"
import { DeleteWalletDialog } from "@/components/wallets/delete-wallet-dialog"
import { Button } from "@/components/ui/button"
import { Plus, Wallet } from "lucide-react"
import { toast } from "sonner"

interface Wallet {
  id: string
  name: string
  type: WalletType
  balance: string | number
  currency: string
  _count?: {
    transactions: number
  }
}

export default function WalletsPage() {
  const { data: session, status } = useSession()
  const [wallets, setWallets] = useState<Wallet[]>([])
  const [isAddWalletOpen, setIsAddWalletOpen] = useState(false)
  const [isEditWalletOpen, setIsEditWalletOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedWallet, setSelectedWallet] = useState<Wallet | null>(null)
  const [loading, setLoading] = useState(true)
  const [isDeleting, setIsDeleting] = useState(false)

  const fetchWallets = async () => {
    try {
      const response = await fetch("/api/wallets")
      if (response.ok) {
        const data = await response.json()
        setWallets(data)
      }
    } catch (error) {
      console.error("Failed to fetch wallets:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (session) {
      fetchWallets()
    }
  }, [session])

  if (status === "loading") {
    return <div>Loading...</div>
  }

  if (!session) {
    redirect("/auth/signin")
  }

  const handleWalletAdded = () => {
    setIsAddWalletOpen(false)
    fetchWallets()
  }

  const handleEditWallet = (wallet: Wallet) => {
    setSelectedWallet(wallet)
    setIsEditWalletOpen(true)
  }

  const handleWalletUpdated = () => {
    setIsEditWalletOpen(false)
    setSelectedWallet(null)
    fetchWallets()
  }

  const handleDeleteWallet = (walletId: string) => {
    const wallet = wallets.find(w => w.id === walletId)
    if (wallet) {
      setSelectedWallet(wallet)
      setIsDeleteDialogOpen(true)
    }
  }

  const handleConfirmDelete = async () => {
    if (!selectedWallet) return
    
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/wallets/${selectedWallet.id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toast.success(`"${selectedWallet.name}" wallet has been deleted successfully!`)
        setIsDeleteDialogOpen(false)
        setSelectedWallet(null)
        fetchWallets()
      } else {
        throw new Error("Failed to delete wallet")
      }
    } catch (error) {
      console.error("Error deleting wallet:", error)
      toast.error("Failed to delete wallet. Please try again.")
    } finally {
      setIsDeleting(false)
    }
  }

  const totalBalance = wallets.reduce((sum, wallet) => sum + Number(wallet.balance), 0)

  return (
    <>
      <SidebarNav 
        onAddWallet={() => setIsAddWalletOpen(true)}
      />
      
      <div className="min-h-screen bg-background lg:ml-80">
        <main className="container mx-auto px-4 py-6 lg:py-6 pt-20 lg:pt-6 space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">My Wallets</h1>
          <p className="text-muted-foreground">
            Manage your payment methods and accounts
          </p>
        </div>

        {/* Total Balance Card */}
        <div className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">Total Balance</p>
              <p className="text-3xl font-bold">
                ₱{totalBalance.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <Wallet className="h-8 w-8 opacity-80" />
          </div>
        </div>

        {/* Add Wallet Button - Desktop */}
        <div className="hidden md:block">
          <Button onClick={() => setIsAddWalletOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add New Wallet
          </Button>
        </div>

        {/* Wallets Grid */}
        {loading ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Loading wallets...</p>
          </div>
        ) : wallets.length === 0 ? (
          <div className="text-center py-8 space-y-4">
            <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center">
              <Wallet className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">No wallets yet</h3>
              <p className="text-muted-foreground">
                Add your first wallet to start tracking your finances
              </p>
            </div>
            <Button onClick={() => setIsAddWalletOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Your First Wallet
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {wallets.map((wallet) => (
              <WalletCard
                key={wallet.id}
                wallet={wallet}
                onEdit={handleEditWallet}
                onDelete={handleDeleteWallet}
              />
            ))}
          </div>
        )}

        {/* Add Wallet Form */}
        <AddWalletForm 
          open={isAddWalletOpen}
          onOpenChange={setIsAddWalletOpen}
          onSuccess={handleWalletAdded}
        />

        {/* Edit Wallet Form */}
        <EditWalletForm 
          open={isEditWalletOpen}
          onOpenChange={setIsEditWalletOpen}
          onSuccess={handleWalletUpdated}
          wallet={selectedWallet}
        />

        {/* Delete Confirmation Dialog */}
        <DeleteWalletDialog 
          open={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
          onConfirm={handleConfirmDelete}
          walletName={selectedWallet?.name || ""}
          isLoading={isDeleting}
        />
        </main>
      </div>
    </>
  )
}