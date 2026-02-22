'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useClientDetails } from '@/hooks/useClientDetails'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  ArrowLeft,
  User,
  Building2,
  Mail,
  Phone,
  MapPin,
  Edit,
  FileText,
  Briefcase,
  Activity,
  FolderOpen,
  Calendar,
  HardHat,
} from 'lucide-react'
import { ClientDialog } from '@/components/comercial/ClientDialog'
import { ClientResumo } from '@/components/comercial/client-details/ClientResumo'
import { ClientDeals } from '@/components/comercial/client-details/ClientDeals'
import { ClientProjects } from '@/components/comercial/client-details/ClientProjects'
import { ClientContracts } from '@/components/comercial/client-details/ClientContracts'
import { ClientActivities } from '@/components/comercial/client-details/ClientActivities'
import { ClientObras } from '@/components/comercial/client-details/ClientObras'
import { toast } from 'sonner'

export default function ClientDetailPage() {
  const params = useParams()
  const router = useRouter()
  const clientId = params.id as string

  const { client, deals, projects, contracts, activities, obras, loading, updateClient, refetch } = useClientDetails(clientId)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('resumo')

  const handleUpdate = async (data: any) => {
    const { error } = await updateClient(data)
    if (error) {
      toast.error('Erro ao atualizar cliente', { description: error })
      return { error }
    }
    toast.success('Cliente atualizado com sucesso!')
    return { error: null }
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

  if (loading) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  if (!client) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <User className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">Cliente não encontrado</h3>
        <Button onClick={() => router.push('/dashboard/comercial')} variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar para Clientes
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/dashboard/comercial')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3 mb-2">
              {client.type === 'pessoa_juridica' ? (
                <Building2 className="h-8 w-8 text-muted-foreground" />
              ) : (
                <User className="h-8 w-8 text-muted-foreground" />
              )}
              <div>
                <h1 className="text-3xl font-bold">{client.name}</h1>
                {client.type === 'pessoa_juridica' && client.razao_social && (
                  <p className="text-sm text-muted-foreground">{client.razao_social}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              {client.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  <span>{client.email}</span>
                </div>
              )}
              {client.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  <span>{client.phone}</span>
                </div>
              )}
              {client.address_city && client.address_state && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  <span>
                    {client.address_city}, {client.address_state}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {getStatusBadge(client.status)}
          <Button onClick={() => setEditDialogOpen(true)}>
            <Edit className="mr-2 h-4 w-4" />
            Editar
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Deals</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{deals.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Projetos</CardTitle>
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{projects.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Obras</CardTitle>
            <HardHat className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{obras.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Contratos</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{contracts.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Atividades</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activities.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
        <TabsList className="grid w-full max-w-4xl grid-cols-6">
          <TabsTrigger value="resumo" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Resumo
          </TabsTrigger>
          <TabsTrigger value="deals" className="flex items-center gap-2">
            <Briefcase className="h-4 w-4" />
            Deals
          </TabsTrigger>
          <TabsTrigger value="projetos" className="flex items-center gap-2">
            <FolderOpen className="h-4 w-4" />
            Projetos
          </TabsTrigger>
          <TabsTrigger value="obras" className="flex items-center gap-2">
            <HardHat className="h-4 w-4" />
            Obras
          </TabsTrigger>
          <TabsTrigger value="contratos" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Contratos
          </TabsTrigger>
          <TabsTrigger value="atividades" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Atividades
          </TabsTrigger>
        </TabsList>

        <TabsContent value="resumo" className="mt-6">
          <ClientResumo client={client} />
        </TabsContent>

        <TabsContent value="deals" className="mt-6">
          <ClientDeals deals={deals} clientId={clientId} refetch={refetch} />
        </TabsContent>

        <TabsContent value="projetos" className="mt-6">
          <ClientProjects projects={projects} clientId={clientId} refetch={refetch} />
        </TabsContent>

        <TabsContent value="obras" className="mt-6">
          <ClientObras obras={obras} clientId={clientId} refetch={refetch} />
        </TabsContent>

        <TabsContent value="contratos" className="mt-6">
          <ClientContracts contracts={contracts} clientId={clientId} refetch={refetch} />
        </TabsContent>

        <TabsContent value="atividades" className="mt-6">
          <ClientActivities activities={activities} clientId={clientId} refetch={refetch} />
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <ClientDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        client={client}
        onSave={handleUpdate}
      />
    </div>
  )
}
