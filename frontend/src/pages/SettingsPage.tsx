import { useState, useEffect } from "react"
import { AdminSidebar } from "@/components/admin-sidebar"
import { SiteHeader } from "@/components/site-header"
import { BranchProvider } from "@/context/branch-context"
import { useCompany } from "@/context/CompanyContext"
import { companySettingsApi } from "@/lib/api"
import { toast } from "sonner"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { IconBuilding, IconReceipt, IconDeviceFloppy } from "@tabler/icons-react"

function SettingsContent() {
  const { settings: company, refreshSettings } = useCompany()

  // Form state
  const [companyName, setCompanyName] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [address, setAddress] = useState("")
  const [website, setWebsite] = useState("")
  const [taxId, setTaxId] = useState("")
  const [receiptFooter, setReceiptFooter] = useState("")
  const [receiptTagline, setReceiptTagline] = useState("")
  const [currencySymbol, setCurrencySymbol] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  // Load current settings into form
  useEffect(() => {
    setCompanyName(company.companyName || "")
    setPhone(company.phone || "")
    setEmail(company.email || "")
    setAddress(company.address || "")
    setWebsite(company.website || "")
    setTaxId(company.taxId || "")
    setReceiptFooter(company.receiptFooter || "")
    setReceiptTagline(company.receiptTagline || "")
    setCurrencySymbol(company.currencySymbol || "UGX")
  }, [company])

  const handleSaveCompany = async () => {
    if (!companyName.trim()) {
      toast.error("Company name is required")
      return
    }
    setIsSaving(true)
    try {
      await companySettingsApi.update({
        companyName: companyName.trim(),
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        address: address.trim() || undefined,
        website: website.trim() || undefined,
        taxId: taxId.trim() || undefined,
      })
      await refreshSettings()
      toast.success("Company details saved successfully")
    } catch (err) {
      console.error("Failed to save company details:", err)
      toast.error("Failed to save company details")
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveReceipt = async () => {
    setIsSaving(true)
    try {
      await companySettingsApi.update({
        receiptFooter: receiptFooter.trim(),
        receiptTagline: receiptTagline.trim(),
        currencySymbol: currencySymbol.trim() || "UGX",
      })
      await refreshSettings()
      toast.success("Receipt settings saved successfully")
    } catch (err) {
      console.error("Failed to save receipt settings:", err)
      toast.error("Failed to save receipt settings")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AdminSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-6 py-4 md:py-6 px-4 lg:px-6">
              <div>
                <h1 className="text-2xl font-bold">Settings</h1>
                <p className="text-muted-foreground">Manage company details and receipt configuration</p>
              </div>

              {/* Company Details */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <IconBuilding className="size-5" />
                    <div>
                      <CardTitle>Company Details</CardTitle>
                      <CardDescription>Business information displayed on receipts and reports</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="companyName">Company Name *</Label>
                      <Input
                        id="companyName"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        placeholder="e.g. HOTLINES"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="e.g. +256 700 000000"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="e.g. info@hotlines.co.ug"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="website">Website</Label>
                      <Input
                        id="website"
                        value={website}
                        onChange={(e) => setWebsite(e.target.value)}
                        placeholder="e.g. www.hotlines.co.ug"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="taxId">Tax ID / TIN</Label>
                      <Input
                        id="taxId"
                        value={taxId}
                        onChange={(e) => setTaxId(e.target.value)}
                        placeholder="e.g. 1234567890"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Textarea
                      id="address"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="e.g. Plot 12, Kampala Road, Kampala"
                      rows={2}
                    />
                  </div>
                  <div className="flex justify-end">
                    <Button onClick={handleSaveCompany} disabled={isSaving}>
                      <IconDeviceFloppy className="size-4 mr-2" />
                      {isSaving ? "Saving..." : "Save Company Details"}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Separator />

              {/* Receipt Configuration */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <IconReceipt className="size-5" />
                    <div>
                      <CardTitle>Receipt Configuration</CardTitle>
                      <CardDescription>Customize what appears on printed receipts</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="receiptFooter">Receipt Footer Message</Label>
                      <Input
                        id="receiptFooter"
                        value={receiptFooter}
                        onChange={(e) => setReceiptFooter(e.target.value)}
                        placeholder="e.g. Thank you for your purchase!"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="receiptTagline">Receipt Tagline</Label>
                      <Input
                        id="receiptTagline"
                        value={receiptTagline}
                        onChange={(e) => setReceiptTagline(e.target.value)}
                        placeholder="e.g. Please come again"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="currencySymbol">Currency Symbol</Label>
                      <Input
                        id="currencySymbol"
                        value={currencySymbol}
                        onChange={(e) => setCurrencySymbol(e.target.value)}
                        placeholder="e.g. UGX"
                      />
                    </div>
                  </div>

                  {/* Receipt Preview */}
                  <div className="mt-4">
                    <Label className="text-sm text-muted-foreground mb-2 block">Receipt Preview</Label>
                    <div className="border rounded-lg p-5 max-w-xs mx-auto bg-white text-black text-xs" style={{ fontFamily: "'Segoe UI', Arial, sans-serif" }}>
                      <div className="text-center border-b border-dashed border-gray-400 pb-3 mb-3">
                        <p className="font-extrabold text-base tracking-widest uppercase">{companyName || "Company Name"}</p>
                        {address && <p className="text-[10px] text-gray-600">{address}</p>}
                        {phone && <p className="text-[10px] text-gray-600">Tel: {phone}</p>}
                        <p className="text-[10px] text-gray-500 font-semibold mt-1">Main Branch</p>
                        <p className="text-[10px] text-gray-500">{new Date().toLocaleString()}</p>
                      </div>
                      <div className="space-y-0.5 mb-3 text-[11px]">
                        <div className="flex justify-between"><span className="text-gray-500">Receipt #:</span><span className="font-semibold">SAL-00001</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">Cashier:</span><span className="font-semibold">John Doe</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">Payment:</span><span className="font-semibold">CASH</span></div>
                      </div>
                      <div className="border-t border-dashed border-gray-400 pt-2 mb-2">
                        <div className="mb-2 pb-2 border-b border-dotted border-gray-300">
                          <p className="font-semibold text-xs">Samsung Galaxy S24 Ultra 256GB</p>
                          <div className="flex justify-between mt-0.5 text-[11px]">
                            <span className="text-gray-500">2 x {currencySymbol} 5,000</span>
                            <span className="font-bold text-xs">{currencySymbol} 10,000</span>
                          </div>
                        </div>
                        <div>
                          <p className="font-semibold text-xs">USB-C Charging Cable 2m</p>
                          <div className="flex justify-between mt-0.5 text-[11px]">
                            <span className="text-gray-500">1 x {currencySymbol} 3,000</span>
                            <span className="font-bold text-xs">{currencySymbol} 3,000</span>
                          </div>
                        </div>
                      </div>
                      <div className="border-t-2 border-gray-800 pt-2 flex justify-between font-extrabold text-sm">
                        <span>TOTAL:</span><span>{currencySymbol} 13,000</span>
                      </div>
                      <div className="text-center border-t border-dashed border-gray-400 mt-3 pt-2">
                        <p className="font-bold text-[11px]">{receiptFooter || "Thank you for your purchase!"}</p>
                        <p className="text-gray-500 text-[10px]">{receiptTagline || "Please come again"}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button onClick={handleSaveReceipt} disabled={isSaving}>
                      <IconDeviceFloppy className="size-4 mr-2" />
                      {isSaving ? "Saving..." : "Save Receipt Settings"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

export function SettingsPage() {
  return (
    <BranchProvider>
      <SettingsContent />
    </BranchProvider>
  )
}
