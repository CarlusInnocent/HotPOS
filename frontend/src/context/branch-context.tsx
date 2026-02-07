import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { branchApi, type Branch } from "@/lib/api"

interface BranchContextType {
  branches: Branch[]
  selectedBranch: Branch | null // null means "All Branches" / company-wide view
  setSelectedBranch: (branch: Branch | null) => void
  isCompanyView: boolean
  isLoading: boolean
  error: string | null
  refetchBranches: () => Promise<void>
}

const BranchContext = createContext<BranchContextType | undefined>(undefined)

export function BranchProvider({ children }: { children: ReactNode }) {
  const [branches, setBranches] = useState<Branch[]>([])
  const [selectedBranch, setSelectedBranchState] = useState<Branch | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Persist selected branch to localStorage so it survives page navigation
  const setSelectedBranch = (branch: Branch | null) => {
    setSelectedBranchState(branch)
    if (branch) {
      localStorage.setItem("selectedBranchId", branch.id.toString())
    } else {
      localStorage.removeItem("selectedBranchId")
    }
  }

  const fetchBranches = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await branchApi.getAll()
      const activeBranches = data.filter(b => b.isActive)
      setBranches(activeBranches)

      // Restore previously selected branch from localStorage
      const savedBranchId = localStorage.getItem("selectedBranchId")
      if (savedBranchId) {
        const saved = activeBranches.find(b => b.id.toString() === savedBranchId)
        if (saved) {
          setSelectedBranchState(saved)
        } else {
          // Saved branch no longer exists/active — clear it
          localStorage.removeItem("selectedBranchId")
        }
      }
    } catch (err) {
      console.error("Failed to fetch branches:", err)
      setError("Failed to load branches")
      // Fallback to empty array
      setBranches([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchBranches()
  }, [])

  const value = {
    branches,
    selectedBranch,
    setSelectedBranch,
    isCompanyView: selectedBranch === null,
    isLoading,
    error,
    refetchBranches: fetchBranches,
  }

  return (
    <BranchContext.Provider value={value}>
      {children}
    </BranchContext.Provider>
  )
}

export function useBranch() {
  const context = useContext(BranchContext)
  if (context === undefined) {
    throw new Error("useBranch must be used within a BranchProvider")
  }
  return context
}

export type { Branch }
