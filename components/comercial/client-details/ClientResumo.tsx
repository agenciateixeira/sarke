'use client'

import { Client, ESTADO_CIVIL_LABELS } from '@/types/crm'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  User,
  Building2,
  Mail,
  Phone,
  MapPin,
  FileText,
  Briefcase,
  CreditCard,
  Calendar,
} from 'lucide-react'

interface ClientResumoProps {
  client: Client
}

export function ClientResumo({ client }: ClientResumoProps) {
  const isPessoaJuridica = client.type === 'pessoa_juridica'

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR')
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Informações Básicas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {isPessoaJuridica ? (
              <>
                <Building2 className="h-5 w-5" />
                Informações da Empresa
              </>
            ) : (
              <>
                <User className="h-5 w-5" />
                Informações Pessoais
              </>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">Nome</p>
            <p className="font-medium">{client.name}</p>
          </div>

          {isPessoaJuridica ? (
            <>
              {client.razao_social && (
                <div>
                  <p className="text-sm text-muted-foreground">Razão Social</p>
                  <p className="font-medium">{client.razao_social}</p>
                </div>
              )}
              {client.cnpj && (
                <div>
                  <p className="text-sm text-muted-foreground">CNPJ</p>
                  <p className="font-medium">{client.cnpj}</p>
                </div>
              )}
              {client.representante_legal && (
                <div>
                  <p className="text-sm text-muted-foreground">Representante Legal</p>
                  <p className="font-medium">{client.representante_legal}</p>
                </div>
              )}
              {client.inscricao_estadual && (
                <div>
                  <p className="text-sm text-muted-foreground">Inscrição Estadual</p>
                  <p className="font-medium">{client.inscricao_estadual}</p>
                </div>
              )}
              {client.inscricao_municipal && (
                <div>
                  <p className="text-sm text-muted-foreground">Inscrição Municipal</p>
                  <p className="font-medium">{client.inscricao_municipal}</p>
                </div>
              )}
              {client.website && (
                <div>
                  <p className="text-sm text-muted-foreground">Website</p>
                  <a
                    href={client.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-primary hover:underline"
                  >
                    {client.website}
                  </a>
                </div>
              )}
            </>
          ) : (
            <>
              {client.cpf_cnpj && (
                <div>
                  <p className="text-sm text-muted-foreground">CPF</p>
                  <p className="font-medium">{client.cpf_cnpj}</p>
                </div>
              )}
              {client.rg && (
                <div>
                  <p className="text-sm text-muted-foreground">RG</p>
                  <p className="font-medium">{client.rg}</p>
                </div>
              )}
              {client.estado_civil && (
                <div>
                  <p className="text-sm text-muted-foreground">Estado Civil</p>
                  <p className="font-medium">{ESTADO_CIVIL_LABELS[client.estado_civil]}</p>
                </div>
              )}
              {client.profissao && (
                <div>
                  <p className="text-sm text-muted-foreground">Profissão</p>
                  <p className="font-medium">{client.profissao}</p>
                </div>
              )}
            </>
          )}

          <div>
            <p className="text-sm text-muted-foreground">Status</p>
            <Badge
              variant={
                client.status === 'active'
                  ? 'default'
                  : client.status === 'inactive'
                  ? 'secondary'
                  : 'outline'
              }
            >
              {client.status === 'active'
                ? 'Ativo'
                : client.status === 'inactive'
                ? 'Inativo'
                : 'Prospect'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Contato */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Contato
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {client.email && (
            <div className="flex items-start gap-3">
              <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <a
                  href={`mailto:${client.email}`}
                  className="font-medium text-primary hover:underline"
                >
                  {client.email}
                </a>
              </div>
            </div>
          )}

          {client.phone && (
            <div className="flex items-start gap-3">
              <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">Telefone</p>
                <a
                  href={`tel:${client.phone}`}
                  className="font-medium text-primary hover:underline"
                >
                  {client.phone}
                </a>
              </div>
            </div>
          )}

          {(client.address_street || client.address_city) && (
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">Endereço</p>
                <div className="font-medium">
                  {client.address_street && (
                    <p>
                      {client.address_street}
                      {client.address_number && `, ${client.address_number}`}
                    </p>
                  )}
                  {client.address_complement && <p>{client.address_complement}</p>}
                  {client.address_neighborhood && <p>{client.address_neighborhood}</p>}
                  {client.address_city && client.address_state && (
                    <p>
                      {client.address_city}, {client.address_state}
                    </p>
                  )}
                  {client.address_zip && <p>CEP: {client.address_zip}</p>}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Observações */}
      {client.notes && (
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Observações
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{client.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Informações do Sistema */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Informações do Sistema
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-sm text-muted-foreground">Data de Cadastro</p>
            <p className="font-medium">{formatDate(client.created_at)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Última Atualização</p>
            <p className="font-medium">{formatDate(client.updated_at)}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
