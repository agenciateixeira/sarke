-- Migration: Adicionar views e funções para analytics do pipeline
-- Data: 2024-02-21
-- Descrição: Cria views materializadas e funções para análise de performance do pipeline

-- 1. View para métricas por estágio do pipeline
CREATE OR REPLACE VIEW pipeline_stage_metrics AS
SELECT
  ps.id as stage_id,
  ps.name as stage_name,
  ps.order_index,
  COUNT(d.id) as deals_count,
  SUM(d.value) as total_value,
  SUM(d.value * d.probability / 100) as weighted_value,
  AVG(d.probability) as avg_probability,
  AVG(d.value) as avg_deal_value
FROM pipeline_stages ps
LEFT JOIN deals d ON d.stage_id = ps.id AND d.status = 'open' AND d.archived = false
GROUP BY ps.id, ps.name, ps.order_index
ORDER BY ps.order_index;

-- 2. View para taxa de conversão entre estágios
CREATE OR REPLACE VIEW stage_conversion_rates AS
WITH stage_movements AS (
  SELECT
    dsh.deal_id,
    dsh.previous_stage_id,
    dsh.new_stage_id,
    dsh.created_at,
    ps_prev.order_index as prev_order,
    ps_new.order_index as new_order
  FROM deal_status_history dsh
  LEFT JOIN pipeline_stages ps_prev ON ps_prev.id = dsh.previous_stage_id
  LEFT JOIN pipeline_stages ps_new ON ps_new.id = dsh.new_stage_id
  WHERE dsh.previous_stage_id IS NOT NULL
    AND dsh.new_stage_id IS NOT NULL
    AND dsh.previous_status = 'open'
    AND dsh.new_status = 'open'
)
SELECT
  ps.id as stage_id,
  ps.name as stage_name,
  ps.order_index,
  COUNT(DISTINCT sm.deal_id) as deals_entered,
  COUNT(DISTINCT CASE WHEN sm.new_order > sm.prev_order THEN sm.deal_id END) as deals_advanced,
  COUNT(DISTINCT CASE WHEN sm.new_order < sm.prev_order THEN sm.deal_id END) as deals_regressed,
  CASE
    WHEN COUNT(DISTINCT sm.deal_id) > 0
    THEN ROUND(100.0 * COUNT(DISTINCT CASE WHEN sm.new_order > sm.prev_order THEN sm.deal_id END) / COUNT(DISTINCT sm.deal_id), 2)
    ELSE 0
  END as conversion_rate
FROM pipeline_stages ps
LEFT JOIN stage_movements sm ON sm.previous_stage_id = ps.id
GROUP BY ps.id, ps.name, ps.order_index
ORDER BY ps.order_index;

-- 3. View para tempo médio por estágio
CREATE OR REPLACE VIEW stage_average_duration AS
WITH stage_durations AS (
  SELECT
    dsh.new_stage_id as stage_id,
    dsh.deal_id,
    dsh.created_at as entered_at,
    LEAD(dsh.created_at) OVER (PARTITION BY dsh.deal_id ORDER BY dsh.created_at) as exited_at
  FROM deal_status_history dsh
  WHERE dsh.new_stage_id IS NOT NULL
    AND dsh.new_status = 'open'
)
SELECT
  ps.id as stage_id,
  ps.name as stage_name,
  ps.order_index,
  COUNT(sd.deal_id) as deals_count,
  AVG(EXTRACT(EPOCH FROM (sd.exited_at - sd.entered_at)) / 86400)::INTEGER as avg_days,
  MIN(EXTRACT(EPOCH FROM (sd.exited_at - sd.entered_at)) / 86400)::INTEGER as min_days,
  MAX(EXTRACT(EPOCH FROM (sd.exited_at - sd.entered_at)) / 86400)::INTEGER as max_days
FROM pipeline_stages ps
LEFT JOIN stage_durations sd ON sd.stage_id = ps.id AND sd.exited_at IS NOT NULL
GROUP BY ps.id, ps.name, ps.order_index
ORDER BY ps.order_index;

-- 4. View para performance geral do pipeline
CREATE OR REPLACE VIEW pipeline_performance AS
WITH date_range AS (
  SELECT
    NOW() - INTERVAL '30 days' as start_date,
    NOW() as end_date
),
deals_stats AS (
  SELECT
    COUNT(*) FILTER (WHERE status = 'open' AND archived = false) as active_deals,
    COUNT(*) FILTER (WHERE status = 'won' AND actual_close_date >= (SELECT start_date FROM date_range)) as won_deals_30d,
    COUNT(*) FILTER (WHERE status = 'lost' AND updated_at >= (SELECT start_date FROM date_range)) as lost_deals_30d,
    SUM(value) FILTER (WHERE status = 'open' AND archived = false) as active_pipeline_value,
    SUM(value) FILTER (WHERE status = 'won' AND actual_close_date >= (SELECT start_date FROM date_range)) as won_value_30d,
    AVG(value) FILTER (WHERE status = 'won') as avg_won_deal_value
  FROM deals
)
SELECT
  active_deals,
  won_deals_30d,
  lost_deals_30d,
  active_pipeline_value,
  won_value_30d,
  avg_won_deal_value,
  CASE
    WHEN (won_deals_30d + lost_deals_30d) > 0
    THEN ROUND(100.0 * won_deals_30d / (won_deals_30d + lost_deals_30d), 2)
    ELSE 0
  END as win_rate_30d,
  CASE
    WHEN (won_deals_30d + lost_deals_30d) > 0
    THEN ROUND(100.0 * lost_deals_30d / (won_deals_30d + lost_deals_30d), 2)
    ELSE 0
  END as churn_rate_30d
FROM deals_stats;

-- 5. View para performance por responsável (owner)
CREATE OR REPLACE VIEW owner_performance AS
WITH date_range AS (
  SELECT NOW() - INTERVAL '30 days' as start_date
)
SELECT
  p.id as owner_id,
  p.name as owner_name,
  COUNT(d.id) FILTER (WHERE d.status = 'open' AND d.archived = false) as active_deals,
  COUNT(d.id) FILTER (WHERE d.status = 'won' AND d.actual_close_date >= (SELECT start_date FROM date_range)) as won_deals_30d,
  COUNT(d.id) FILTER (WHERE d.status = 'lost' AND d.updated_at >= (SELECT start_date FROM date_range)) as lost_deals_30d,
  SUM(d.value) FILTER (WHERE d.status = 'open' AND d.archived = false) as active_pipeline_value,
  SUM(d.value) FILTER (WHERE d.status = 'won' AND d.actual_close_date >= (SELECT start_date FROM date_range)) as won_value_30d,
  CASE
    WHEN COUNT(d.id) FILTER (WHERE (d.status = 'won' OR d.status = 'lost') AND d.updated_at >= (SELECT start_date FROM date_range)) > 0
    THEN ROUND(100.0 * COUNT(d.id) FILTER (WHERE d.status = 'won' AND d.actual_close_date >= (SELECT start_date FROM date_range)) /
      COUNT(d.id) FILTER (WHERE (d.status = 'won' OR d.status = 'lost') AND d.updated_at >= (SELECT start_date FROM date_range)), 2)
    ELSE 0
  END as win_rate_30d
FROM profiles p
LEFT JOIN deals d ON d.owner_id = p.id
GROUP BY p.id, p.name
HAVING COUNT(d.id) > 0
ORDER BY won_value_30d DESC NULLS LAST;

-- 6. View para análise de churn detalhada
CREATE OR REPLACE VIEW churn_analysis AS
WITH monthly_data AS (
  SELECT
    DATE_TRUNC('month', dsh.created_at) as month,
    COUNT(DISTINCT dsh.deal_id) FILTER (WHERE dsh.new_status = 'lost') as churned_deals,
    COUNT(DISTINCT dsh.deal_id) FILTER (WHERE dsh.new_status = 'won') as won_deals,
    COUNT(DISTINCT dsh.deal_id) FILTER (WHERE dsh.new_status = 'open' AND dsh.previous_status = 'lost') as reactivated_deals
  FROM deal_status_history dsh
  WHERE dsh.created_at >= NOW() - INTERVAL '12 months'
  GROUP BY DATE_TRUNC('month', dsh.created_at)
)
SELECT
  month,
  churned_deals,
  won_deals,
  reactivated_deals,
  CASE
    WHEN (churned_deals + won_deals) > 0
    THEN ROUND(100.0 * churned_deals / (churned_deals + won_deals), 2)
    ELSE 0
  END as churn_rate,
  CASE
    WHEN churned_deals > 0
    THEN ROUND(100.0 * reactivated_deals / churned_deals, 2)
    ELSE 0
  END as reactivation_rate
FROM monthly_data
ORDER BY month DESC;

-- 7. View para principais motivos de perda
CREATE OR REPLACE VIEW lost_reasons_analysis AS
SELECT
  d.lost_reason,
  COUNT(*) as count,
  SUM(d.value) as total_value_lost,
  AVG(d.value) as avg_value_lost,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) as percentage
FROM deals d
WHERE d.status = 'lost'
  AND d.lost_reason IS NOT NULL
  AND d.updated_at >= NOW() - INTERVAL '6 months'
GROUP BY d.lost_reason
ORDER BY count DESC;

-- 8. Função para calcular previsão de receita
CREATE OR REPLACE FUNCTION calculate_revenue_forecast(months INTEGER DEFAULT 3)
RETURNS TABLE (
  month DATE,
  forecasted_revenue NUMERIC,
  confidence_level TEXT
) AS $$
BEGIN
  RETURN QUERY
  WITH historical_data AS (
    SELECT
      DATE_TRUNC('month', actual_close_date)::DATE as month,
      SUM(value) as revenue
    FROM deals
    WHERE status = 'won'
      AND actual_close_date >= NOW() - INTERVAL '12 months'
    GROUP BY DATE_TRUNC('month', actual_close_date)
  ),
  avg_revenue AS (
    SELECT AVG(revenue) as avg_monthly_revenue
    FROM historical_data
  ),
  pipeline_value AS (
    SELECT SUM(value * probability / 100) as weighted_pipeline_value
    FROM deals
    WHERE status = 'open' AND archived = false
  )
  SELECT
    (DATE_TRUNC('month', NOW()) + (INTERVAL '1 month' * generate_series(1, months)))::DATE as month,
    COALESCE((SELECT avg_monthly_revenue FROM avg_revenue), 0) +
      (COALESCE((SELECT weighted_pipeline_value FROM pipeline_value), 0) / months) as forecasted_revenue,
    CASE
      WHEN (SELECT COUNT(*) FROM historical_data) >= 6 THEN 'High'
      WHEN (SELECT COUNT(*) FROM historical_data) >= 3 THEN 'Medium'
      ELSE 'Low'
    END as confidence_level;
END;
$$ LANGUAGE plpgsql;

-- 9. Comentários nas views
COMMENT ON VIEW pipeline_stage_metrics IS 'Métricas agregadas por estágio do pipeline';
COMMENT ON VIEW stage_conversion_rates IS 'Taxa de conversão entre estágios do pipeline';
COMMENT ON VIEW stage_average_duration IS 'Tempo médio que deals permanecem em cada estágio';
COMMENT ON VIEW pipeline_performance IS 'Performance geral do pipeline nos últimos 30 dias';
COMMENT ON VIEW owner_performance IS 'Performance individual dos responsáveis por deals';
COMMENT ON VIEW churn_analysis IS 'Análise detalhada de churn por mês';
COMMENT ON VIEW lost_reasons_analysis IS 'Principais motivos de perda de deals';
