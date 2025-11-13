import { DispatchLabel } from "@/components/DispatchLabel"

export default function DispatchPage() {
  return (
    <div className="min-h-screen p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Dispatch & Label Printing</h1>
        <p className="mt-2 text-muted-foreground">Generate and print labels for order dispatch</p>
      </div>

      <DispatchLabel />
    </div>
  )
}
