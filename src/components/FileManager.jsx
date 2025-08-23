import { useRef } from 'react'

const FileManager = ({ files, activeFileId, onFileSelect, onFileAdd, onFileDelete }) => {
  const fileInputRef = useRef(null)

  const handleFileUpload = async (event) => {
    const uploadedFiles = Array.from(event.target.files)
    const fileContents = []

    for (const file of uploadedFiles) {
      if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
        try {
          const content = await readFileContent(file)
          fileContents.push({
            name: file.name,
            content: content
          })
        } catch (error) {
          console.error(`Error reading file ${file.name}:`, error)
        }
      }
    }

    if (fileContents.length > 0) {
      onFileAdd(fileContents)
    }

    // Reset file input
    event.target.value = ''
  }

  const readFileContent = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      
      reader.onload = (e) => {
        let content = e.target.result
        
        // Convert line breaks to HTML breaks and preserve formatting
        content = content
          .replace(/\r\n/g, '\n')
          .replace(/\r/g, '\n')
          .replace(/\n/g, '<br>')
          .replace(/  /g, '&nbsp;&nbsp;') // Preserve double spaces
        
        resolve(content)
      }
      
      reader.onerror = (e) => reject(e)
      
      // Try to detect encoding and read accordingly
      try {
        reader.readAsText(file, 'UTF-8')
      } catch (error) {
        // Fallback to default encoding
        reader.readAsText(file)
      }
    })
  }

  const formatFileSize = (size) => {
    if (size < 1024) return `${size} B`
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
    return `${(size / (1024 * 1024)).toFixed(1)} MB`
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="p-4 flex-1 overflow-auto">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Dateien</h3>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="px-3 py-1 bg-green-600 hover:bg-green-500 rounded text-sm transition-colors"
        >
          + Upload
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".txt,text/plain"
        multiple
        onChange={handleFileUpload}
        className="hidden"
      />

      <div className="space-y-2">
        {files.length === 0 ? (
          <div className="text-gray-400 text-sm text-center py-8">
            <p>Keine Dateien vorhanden</p>
            <p className="mt-2">Lade .txt-Dateien hoch um zu beginnen</p>
          </div>
        ) : (
          files.map(file => (
            <div
              key={file.id}
              className={`p-3 rounded border cursor-pointer transition-all ${
                file.id === activeFileId
                  ? 'bg-blue-600 border-blue-500'
                  : 'bg-gray-700 border-gray-600 hover:bg-gray-600'
              }`}
              onClick={() => onFileSelect(file.id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-white truncate">
                    {file.name}
                  </h4>
                  <p className="text-xs text-gray-300 mt-1">
                    {formatDate(file.createdAt)}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {file.content.replace(/<[^>]*>/g, '').length} Zeichen
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onFileDelete(file.id)
                  }}
                  className="ml-2 p-1 text-gray-400 hover:text-red-400 transition-colors"
                  title="Datei löschen"
                >
                  ×
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-6 p-3 bg-gray-800 rounded text-xs text-gray-400">
        <h4 className="font-medium mb-2">Unterstützte Formate:</h4>
        <ul className="space-y-1">
          <li>• .txt Dateien (UTF-8, Windows-1252)</li>
          <li>• Automatische Encoding-Erkennung</li>
          <li>• Mehrere Dateien gleichzeitig</li>
        </ul>
      </div>
    </div>
  )
}

export default FileManager
