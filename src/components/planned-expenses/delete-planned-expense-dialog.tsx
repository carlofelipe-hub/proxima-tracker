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

interface DeletePlannedExpenseDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  expenseTitle: string
  isLoading?: boolean
}

export function DeletePlannedExpenseDialog({ 
  open, 
  onOpenChange, 
  onConfirm, 
  expenseTitle,
  isLoading = false 
}: DeletePlannedExpenseDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Planned Expense</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete &quot;{expenseTitle}&quot;? This action cannot be undone.
            All progress and data associated with this planned expense will be permanently removed.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isLoading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isLoading ? "Deleting..." : "Delete Expense"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}