import { useEffect, useMemo, useState } from 'react'
import Papa from 'papaparse'

export const useCsvParser = (file: File | null) => {
  const [csvData, setCsvData] = useState<any>(null)
  const [isParsing, setIsParsing] = useState(false)

  useEffect(() => {
    if (!file) {
      setCsvData(null)
      return
    }

    setIsParsing(true)
    Papa.parse(file, {
      header: true,
      preview: 3,
      skipEmptyLines: true,
      complete: (results) => {
        setCsvData(results)
        setIsParsing(false)
      },
      error: (error) => {
        setCsvData(null)
        setIsParsing(false)
      },
    })
  }, [file])

  const csvHeaders: string[] = useMemo(() => {
    if (!csvData?.data || csvData.data.length === 0) {
      return []
    }

    // Check if CSV has headers from meta.fields
    if (csvData?.meta?.fields && csvData.meta.fields.length > 0) {
      return csvData.meta.fields
    }

    // Fallback: get keys from first row or generate column names
    const firstRow = csvData.data[0]
    if (firstRow && typeof firstRow === 'object') {
      const keys = Object.keys(firstRow)
      // If keys are empty or look like auto-generated indices, create column names
      if (keys.length === 0 || keys.every((key) => /^\d+$/.test(key))) {
        return keys.map((_, index) => `column${index + 1}`)
      }
      return keys
    }
    return []
  }, [csvData])

  return {
    csvData,
    csvHeaders,
    isParsing,
  }
}
