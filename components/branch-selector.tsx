"use client"

import { useBranch } from "@/contexts/branch-context"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Building2, ChevronDown, Check } from "lucide-react"

interface BranchSelectorProps {
  variant?: "default" | "compact"
  className?: string
}

export function BranchSelector({ variant = "default", className }: BranchSelectorProps) {
  const { branches, currentBranch, setCurrentBranch, isLoading } = useBranch()

  if (isLoading) {
    return (
      <Button variant="outline" disabled className={className}>
        <Building2 className="h-4 w-4 mr-2" />
        Loading...
      </Button>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className={className}>
          <Building2 className="h-4 w-4 mr-2" />
          {variant === "compact" ? currentBranch.name.split(" ")[0] : currentBranch.name}
          <ChevronDown className="h-4 w-4 ml-2" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[200px]">
        {branches.map((branch) => (
          <DropdownMenuItem
            key={branch.id}
            onClick={() => setCurrentBranch(branch)}
            className="flex items-center justify-between"
          >
            <span>{branch.name}</span>
            {currentBranch.id === branch.id && (
              <Check className="h-4 w-4 text-primary" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
