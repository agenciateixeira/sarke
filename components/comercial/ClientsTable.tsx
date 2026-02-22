'use client'

import { useState } from 'react'
import { Client } from '@/types/crm'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreVertical, Edit, Trash2, Eye, ArrowUpDown } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface ClientsTableProps {
  clients: Client[]
  onEdit: (client: Client) => void
  onDelete: (client: Client) => void
}

type SortField = 'name' | 'email' | 'status' | 'created_at'
type SortDirection = 'asc' | 'desc'

export function ClientsTable({ clients, onEdit, onDelete }: ClientsTableProps) {
  const router = useRouter()
  const [selectedClients, setSelectedClients] = useState<string[]>([])
  const [sortField, setSortField] = useState<SortField>('name')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      active: { variant: 'default', label: 'Ativo' },
      inactive: { variant: 'secondary', label: 'Inativo' },
      prospect: { variant: 'outline', label: 'Prospect' },
    }
    const config = variants[status] || variants.active
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const sortedClients = [...clients].sort((a, b) => {
    const direction = sortDirection === 'asc' ? 1 : -1

    switch (sortField) {
      case 'name':
        return direction * a.name.localeCompare(b.name)
      case 'email':
        return direction * (a.email || '').localeCompare(b.email || '')
      case 'status':
        return direction * a.status.localeCompare(b.status)
      case 'created_at':
        return direction * (new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      default:
        return 0
    }
  })

  const toggleSelectAll = () => {
    if (selectedClients.length === clients.length) {
      setSelectedClients([])
    } else {
      setSelectedClients(clients.map(c => c.id))
    }
  }

  const toggleSelectClient = (clientId: string) => {
    if (selectedClients.includes(clientId)) {
      setSelectedClients(selectedClients.filter(id => id !== clientId))
    } else {
      setSelectedClients([...selectedClients, clientId])
    }
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR')
  }

  return (
    <div className="space-y-4">
      {selectedClients.length > 0 && (
        <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
          <span className="text-sm">
            {selectedClients.length} cliente(s) selecionado(s)
          </span>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => {
              // TODO: Implementar exclusão em massa
              setSelectedClients([])
            }}
          >
            Excluir Selecionados
          </Button>
        </div>
      )}

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedClients.length === clients.length && clients.length > 0}
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('name')}
                  className="hover:bg-transparent"
                >
                  Nome
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('email')}
                  className="hover:bg-transparent"
                >
                  Email
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Cidade/Estado</TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('status')}
                  className="hover:bg-transparent"
                >
                  Status
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('created_at')}
                  className="hover:bg-transparent"
                >
                  Cadastro
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedClients.map((client) => (
              <TableRow
                key={client.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => router.push(`/dashboard/comercial/clientes/${client.id}`)}
              >
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={selectedClients.includes(client.id)}
                    onCheckedChange={() => toggleSelectClient(client.id)}
                  />
                </TableCell>
                <TableCell className="font-medium">{client.name}</TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {client.type === 'pessoa_juridica' ? 'PJ' : 'PF'}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {client.email || '-'}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {client.phone || '-'}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {client.address_city && client.address_state
                    ? `${client.address_city}, ${client.address_state}`
                    : '-'}
                </TableCell>
                <TableCell>{getStatusBadge(client.status)}</TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {formatDate(client.created_at)}
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => router.push(`/dashboard/comercial/clientes/${client.id}`)}
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        Ver Detalhes
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onEdit(client)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => onDelete(client)}
                        className="text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
