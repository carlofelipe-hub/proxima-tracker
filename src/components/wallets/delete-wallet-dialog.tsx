"use client"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface DeleteWalletDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  walletName: string
  isLoading?: boolean
}

export function DeleteWalletDialog({ 
  open, 
  onOpenChange, 
  onConfirm, 
  walletName,
  isLoading = false 
}: DeleteWalletDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Wallet</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete &quot;{walletName}&quot;? This action cannot be undone.
            All transactions associated with this wallet will remain but will be marked as from a deleted wallet.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isLoading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isLoading ? "Deleting..." : "Delete Wallet"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
