'use client'

import { useState } from 'react'
import { useClients } from '@/hooks/useClients'
import { Client } from '@/types/crm'
import { PageHeader } from '@/components/dashboard/PageHeader'
import { ClientDialog } from '@/components/comercial/ClientDialog'
import { ClientsTable } from '@/components/comercial/ClientsTable'
import { ClientImportDialog } from '@/components/comercial/ClientImportDialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Plus, Search, MoreVertical, Edit, Trash2, Mail, Phone, MapPin, Users, Loader2, Eye, LayoutGrid, List, Download, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { exportClientsToExcel, exportClientsToCSV } from '@/lib/exportClients'

type ViewMode = 'cards' | 'table'

export default function ComercialPage() {
  const router = useRouter()
  const { clients, loading, createClient, updateClient, deleteClient } = useClients()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('cards')
  const [importDialogOpen, setImportDialogOpen] = useState(false)

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.phone?.includes(searchTerm)
  )

  const handleSave = async (data: any) => {
    if (selectedClient) {
      const { error } = await updateClient(selectedClient.id, data)
      if (error) {
        toast.error('Erro ao atualizar cliente', { description: error })
        return { error }
      }
      toast.success('Cliente atualizado com sucesso!')
    } else {
      const { error } = await createClient(data)
      if (error) {
        toast.error('Erro ao criar cliente', { description: error })
        return { error }
      }
      toast.success('Cliente cadastrado com sucesso!')
    }
    return { error: null }
  }

  const handleEdit = (client: Client) => {
    setSelectedClient(client)
    setDialogOpen(true)
  }

  const handleDelete = async () => {
    if (!clientToDelete) return

    const { error } = await deleteClient(clientToDelete.id)
    if (error) {
      toast.error('Erro ao excluir cliente', { description: error })
    } else {
      toast.success('Cliente excluído com sucesso!')
    }
    setDeleteDialogOpen(false)
    setClientToDelete(null)
  }

  const handleNewClient = () => {
    setSelectedClient(null)
    setDialogOpen(true)
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      active: { variant: 'default', label: 'Ativo' },
      inactive: { variant: 'secondary', label: 'Inativo' },
      prospect: { variant: 'outline', label: 'Prospect' },
    }
    const config = variants[status] || variants.active
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  const stats = [
    {
      title: 'Total de Clientes',
      value: clients.length.toString(),
      icon: <Users className="h-4 w-4" />,
    },
    {
      title: 'Ativos',
      value: clients.filter(c => c.status === 'active').length.toString(),
      icon: <Users className="h-4 w-4" />,
    },
    {
      title: 'Prospects',
      value: clients.filter(c => c.status === 'prospect').length.toString(),
      icon: <Users className="h-4 w-4" />,
    },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        title="Clientes"
        description="Gerencie seus clientes e prospects"
        actions={
          <Button onClick={handleNewClient}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Cliente
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              {stat.icon}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search and Actions */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar clientes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="flex items-center border rounded-lg p-1">
            <Button
              variant={viewMode === 'cards' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('cards')}
              className="h-8 px-3"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'table' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('table')}
              className="h-8 px-3"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>

          {/* Export Button */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Exportar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => exportClientsToExcel(filteredClients)}>
                Exportar para Excel (.xlsx)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportClientsToCSV(filteredClients)}>
                Exportar para CSV (.csv)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Import Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              console.log('Botão Importar clicado')
              setImportDialogOpen(true)
            }}
          >
            <Upload className="h-4 w-4 mr-2" />
            Importar
          </Button>
        </div>
      </div>

      {/* Clients List */}
      {filteredClients.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="rounded-full bg-muted p-3 mb-4">
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold mb-1">
              {searchTerm ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado'}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {searchTerm
                ? 'Tente buscar com outros termos'
                : 'Comece cadastrando seu primeiro cliente'}
            </p>
            {!searchTerm && (
              <Button onClick={handleNewClient}>
                <Plus className="mr-2 h-4 w-4" />
                Cadastrar Primeiro Cliente
              </Button>
            )}
          </CardContent>
        </Card>
      ) : viewMode === 'table' ? (
        <ClientsTable
          clients={filteredClients}
          onEdit={handleEdit}
          onDelete={(client) => {
            setClientToDelete(client)
            setDeleteDialogOpen(true)
          }}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredClients.map((client) => (
            <Card
              key={client.id}
              className="hover:border-primary/50 transition-colors cursor-pointer"
              onClick={() => router.push(`/dashboard/comercial/clientes/${client.id}`)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base truncate">{client.name}</CardTitle>
                    <div className="mt-2">{getStatusBadge(client.status)}</div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation()
                        router.push(`/dashboard/comercial/clientes/${client.id}`)
                      }}>
                        <Eye className="mr-2 h-4 w-4" />
                        Ver Detalhes
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation()
                        handleEdit(client)
                      }}>
                        <Edit className="mr-2 h-4 w-4" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation()
                          setClientToDelete(client)
                          setDeleteDialogOpen(true)
                        }}
                        className="text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {client.email && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    <span className="truncate">{client.email}</span>
                  </div>
                )}
                {client.phone && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    <span>{client.phone}</span>
                  </div>
                )}
                {client.address_city && client.address_state && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span>
                      {client.address_city}, {client.address_state}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialogs */}
      <ClientDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        client={selectedClient}
        onSave={handleSave}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o cliente <strong>{clientToDelete?.name}</strong>?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ClientImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onImportComplete={async () => {
          // Refresh clients list after import
          window.location.reload()
        }}
      />
    </div>
  )
}
