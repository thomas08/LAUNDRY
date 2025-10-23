'use client'

import { useState, useRef, useCallback } from "react"
import { LinenItem } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import {
  Camera,
  Scan,
  Zap,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Eye,
  Sparkles
} from "lucide-react"

interface AIDetectionResult {
  type: string
  confidence: number
  condition: 'excellent' | 'good' | 'fair' | 'poor'
  suggestedTagId: string
  color: string
  material: string
  size: 'small' | 'medium' | 'large' | 'extra_large'
}

export default function AIScannerPage() {
  const [isScanning, setIsScanning] = useState(false)
  const [isCameraActive, setIsCameraActive] = useState(false)
  const [detectionResults, setDetectionResults] = useState<AIDetectionResult[]>([])
  const [alert, setAlert] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null)
  const [scanProgress, setScanProgress] = useState(0)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Mock AI detection results
  const mockDetections: AIDetectionResult[] = [
    {
      type: "Bed Sheet",
      confidence: 94.8,
      condition: "excellent",
      suggestedTagId: "LN" + Math.floor(Math.random() * 1000).toString().padStart(3, '0'),
      color: "White",
      material: "Cotton",
      size: "large"
    },
    {
      type: "Towel",
      confidence: 89.2,
      condition: "good",
      suggestedTagId: "LN" + Math.floor(Math.random() * 1000).toString().padStart(3, '0'),
      color: "Blue",
      material: "Terry Cloth",
      size: "medium"
    },
    {
      type: "Pillow Case",
      confidence: 91.5,
      condition: "excellent",
      suggestedTagId: "LN" + Math.floor(Math.random() * 1000).toString().padStart(3, '0'),
      color: "White",
      material: "Cotton",
      size: "small"
    }
  ]

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: 640,
          height: 480,
          facingMode: 'environment' // Use back camera on mobile
        }
      })

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        setIsCameraActive(true)
        setAlert({ type: 'success', message: 'Camera activated. Position linen items in view and click Scan.' })
      }
    } catch (error) {
      setAlert({ type: 'error', message: 'Unable to access camera. Please check permissions.' })
    }
  }, [])

  const stopCamera = useCallback(() => {
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks()
      tracks.forEach(track => track.stop())
      videoRef.current.srcObject = null
      setIsCameraActive(false)
    }
  }, [])

  const simulateAIAnalysis = useCallback(() => {
    setIsScanning(true)
    setScanProgress(0)
    setAlert({ type: 'info', message: 'AI is analyzing the captured image...' })

    // Simulate AI processing with progress
    const interval = setInterval(() => {
      setScanProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval)

          // Simulate random detection results
          const numDetections = Math.floor(Math.random() * 3) + 1
          const results = mockDetections.slice(0, numDetections).map(detection => ({
            ...detection,
            suggestedTagId: "LN" + Math.floor(Math.random() * 1000).toString().padStart(3, '0'),
            confidence: Math.floor(Math.random() * 20) + 80 // 80-99% confidence
          }))

          setDetectionResults(results)
          setIsScanning(false)
          setAlert({
            type: 'success',
            message: `AI detected ${results.length} linen item${results.length > 1 ? 's' : ''} in the image.`
          })

          return 100
        }
        return prev + Math.floor(Math.random() * 15) + 5
      })
    }, 200)
  }, [])

  const captureAndAnalyze = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return

    const canvas = canvasRef.current
    const video = videoRef.current
    const context = canvas.getContext('2d')

    if (context) {
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      context.drawImage(video, 0, 0)

      // Start AI analysis simulation
      simulateAIAnalysis()
    }
  }, [simulateAIAnalysis])

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return "text-chart-3"
    if (confidence >= 75) return "text-chart-2"
    return "text-chart-4"
  }

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'excellent': return "bg-chart-3/20 text-chart-3 border-chart-3/30"
      case 'good': return "bg-chart-2/20 text-chart-2 border-chart-2/30"
      case 'fair': return "bg-chart-4/20 text-chart-4 border-chart-4/30"
      case 'poor': return "bg-destructive/20 text-destructive border-destructive/30"
      default: return "bg-muted/20 text-muted-foreground border-muted/30"
    }
  }

  return (
    <div className="min-h-screen p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
          <Sparkles className="h-8 w-8 text-primary" />
          AI Linen Scanner
        </h1>
        <p className="mt-2 text-muted-foreground">
          Use AI-powered computer vision to automatically identify and catalog linen items
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Camera Interface */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl font-semibold text-foreground">
              <Camera className="h-5 w-5" />
              Camera View
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Video Preview */}
              <div className="relative bg-muted rounded-lg overflow-hidden aspect-video">
                {isCameraActive ? (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    <div className="text-center">
                      <Camera className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>Camera not active</p>
                    </div>
                  </div>
                )}

                {/* Scanning Overlay */}
                {isScanning && (
                  <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                    <div className="bg-card/90 p-4 rounded-lg text-center">
                      <Zap className="h-8 w-8 mx-auto mb-2 text-primary animate-pulse" />
                      <p className="text-sm font-medium">AI Analyzing...</p>
                      <Progress value={scanProgress} className="mt-2 w-32" />
                    </div>
                  </div>
                )}
              </div>

              {/* Hidden canvas for capture */}
              <canvas ref={canvasRef} className="hidden" />

              {/* Camera Controls */}
              <div className="flex gap-2">
                {!isCameraActive ? (
                  <Button onClick={startCamera} className="flex-1">
                    <Eye className="mr-2 h-4 w-4" />
                    Start Camera
                  </Button>
                ) : (
                  <>
                    <Button
                      onClick={captureAndAnalyze}
                      disabled={isScanning}
                      className="flex-1"
                    >
                      {isScanning ? (
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Scan className="mr-2 h-4 w-4" />
                      )}
                      {isScanning ? 'Analyzing...' : 'Capture & Analyze'}
                    </Button>
                    <Button variant="outline" onClick={stopCamera}>
                      Stop
                    </Button>
                  </>
                )}
              </div>

              {alert && (
                <Alert className={`${
                  alert.type === 'success' ? 'border-chart-3 bg-chart-3/10' :
                  alert.type === 'error' ? 'border-destructive bg-destructive/10' :
                  'border-chart-2 bg-chart-2/10'
                }`}>
                  {alert.type === 'success' ? (
                    <CheckCircle className="h-4 w-4 text-chart-3" />
                  ) : alert.type === 'error' ? (
                    <AlertCircle className="h-4 w-4 text-destructive" />
                  ) : (
                    <Zap className="h-4 w-4 text-chart-2" />
                  )}
                  <AlertDescription className={
                    alert.type === 'success' ? 'text-chart-3' :
                    alert.type === 'error' ? 'text-destructive' : 'text-chart-2'
                  }>
                    {alert.message}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>

        {/* AI Detection Results */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl font-semibold text-foreground">
              <Sparkles className="h-5 w-5" />
              AI Detection Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            {detectionResults.length > 0 ? (
              <div className="space-y-4">
                {detectionResults.map((result, index) => (
                  <div key={index} className="border border-border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-foreground">{result.type}</h3>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium ${getConfidenceColor(result.confidence)}`}>
                          {result.confidence.toFixed(1)}%
                        </span>
                        <Badge variant="outline" className={getConditionColor(result.condition)}>
                          {result.condition}
                        </Badge>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Suggested Tag ID:</span>
                        <p className="font-mono font-medium text-foreground">{result.suggestedTagId}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Size:</span>
                        <p className="font-medium text-foreground capitalize">{result.size}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Color:</span>
                        <p className="font-medium text-foreground">{result.color}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Material:</span>
                        <p className="font-medium text-foreground">{result.material}</p>
                      </div>
                    </div>

                    <Button variant="outline" size="sm" className="w-full">
                      <Plus className="mr-2 h-4 w-4" />
                      Add to Inventory
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="mb-2">No items detected yet</p>
                <p className="text-sm">Capture an image to see AI analysis results</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* AI Capabilities Info */}
      <Card className="mt-8 border-border bg-card">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-foreground">AI Capabilities</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="text-center p-4">
              <Eye className="h-8 w-8 mx-auto mb-2 text-chart-3" />
              <h3 className="font-medium text-foreground mb-1">Object Recognition</h3>
              <p className="text-sm text-muted-foreground">Identifies different types of linen items</p>
            </div>
            <div className="text-center p-4">
              <Sparkles className="h-8 w-8 mx-auto mb-2 text-chart-2" />
              <h3 className="font-medium text-foreground mb-1">Quality Assessment</h3>
              <p className="text-sm text-muted-foreground">Evaluates condition and wear patterns</p>
            </div>
            <div className="text-center p-4">
              <Zap className="h-8 w-8 mx-auto mb-2 text-chart-4" />
              <h3 className="font-medium text-foreground mb-1">Smart Tagging</h3>
              <p className="text-sm text-muted-foreground">Suggests optimal tag IDs and categorization</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}