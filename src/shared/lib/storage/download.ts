import Papa from 'papaparse'

export const parseFileToCSV = (data: Record<string, any>[]) => {
  if (!data || data.length === 0) {
    throw new Error('No data to export')
  }

  // Chuyển mọi object/array thành JSON string
  const sanitizedData = data.map((row) =>
    Object.fromEntries(
      Object.entries(row).map(([key, value]) => {
        if (typeof value === 'object' && value !== null) {
          return [key, JSON.stringify(value)]
        }
        return [key, value]
      })
    )
  )

  const csv = Papa.unparse(sanitizedData, {
    header: true,
    delimiter: ',',
    skipEmptyLines: true,
  })  

  return csv
}
