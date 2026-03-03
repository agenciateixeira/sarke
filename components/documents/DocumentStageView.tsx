'use client'

import { useState } from 'react'
import { ProjectDocumentCategoryWithFiles } from '@/types/documents'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { DocumentCategoryItem } from './DocumentCategoryItem'

interface DocumentStageViewProps {
  categories: ProjectDocumentCategoryWithFiles[]
  stageName: string
  stageIcon?: React.ReactNode
  onRefresh: () => void
}

export function DocumentStageView({
  categories,
  stageName,
  stageIcon,
  onRefresh,
}: DocumentStageViewProps) {
  const [isExpanded, setIsExpanded] = useState(true)

  if (categories.length === 0) return null

  return (
    <div className="space-y-2">
      {/* Stage Header */}
      <div
        className="flex items-center gap-2 py-2 px-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md cursor-pointer group transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 text-gray-500" />
        ) : (
          <ChevronRight className="h-4 w-4 text-gray-500" />
        )}
        {stageIcon}
        <span className="font-semibold text-gray-900 dark:text-gray-100">
          {stageName}
        </span>
        <span className="text-xs text-gray-500">
          ({categories.reduce((acc, cat) => acc + cat.file_count, 0)} arquivos)
        </span>
      </div>

      {/* Categories List */}
      {isExpanded && (
        <div className="space-y-1 pl-6">
          {categories.map((category) => (
            <DocumentCategoryItem
              key={category.id}
              category={category}
              files={category.files}
              onUploadComplete={onRefresh}
            />
          ))}
        </div>
      )}
    </div>
  )
}
