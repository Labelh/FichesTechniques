-- ==========================================
-- SCHEMA SUPABASE POUR FICHES TECHNIQUES
-- ==========================================

-- Activer les extensions nécessaires
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- TABLES
-- ==========================================

-- Table: categories
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  color TEXT NOT NULL,
  icon TEXT,
  parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  procedure_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: tags
CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL,
  procedure_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: tools
CREATE TABLE tools (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  image_url TEXT,
  price DECIMAL(10, 2),
  purchase_link TEXT,
  owned BOOLEAN DEFAULT false,
  alternatives TEXT[], -- Array of tool IDs
  consumables TEXT[], -- Array of consumable names
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: materials
CREATE TABLE materials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  quantity DECIMAL(10, 2) NOT NULL,
  unit TEXT NOT NULL,
  price DECIMAL(10, 2),
  purchase_link TEXT,
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: procedures
CREATE TABLE procedures (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  -- Informations de base
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  tags TEXT[], -- Array of tag names

  -- Statut et priorité
  status TEXT NOT NULL DEFAULT 'draft',
  priority TEXT NOT NULL DEFAULT 'normal',

  -- Métadonnées
  difficulty TEXT NOT NULL,
  estimated_total_time INTEGER DEFAULT 0, -- en minutes
  total_cost DECIMAL(10, 2),

  -- Conditions et prérequis
  season TEXT,
  weather_conditions TEXT,
  required_skills TEXT[],
  number_of_people INTEGER DEFAULT 1,
  risk_level TEXT NOT NULL DEFAULT 'none',

  -- Ressources globales
  global_tool_ids TEXT[],

  -- Cover image (URL dans Supabase Storage)
  cover_image_url TEXT,
  cover_image_annotations JSONB,

  -- Procédures liées
  related_procedures TEXT[], -- Array of procedure IDs
  prerequisites TEXT[], -- Array of procedure IDs

  -- Versioning
  version INTEGER DEFAULT 1,
  parent_version UUID REFERENCES procedures(id) ON DELETE SET NULL,

  -- Dates importantes
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  last_export_date TIMESTAMPTZ,

  -- Statistiques
  view_count INTEGER DEFAULT 0,
  export_count INTEGER DEFAULT 0,

  -- Qualité et validation
  validation_score INTEGER DEFAULT 0,
  completion_percentage INTEGER DEFAULT 0,

  -- Notes privées
  private_notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: phases
CREATE TABLE phases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  procedure_id UUID NOT NULL REFERENCES procedures(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  difficulty TEXT NOT NULL,
  estimated_time INTEGER DEFAULT 0, -- en minutes

  -- Outils et matériaux
  tool_ids TEXT[],
  materials JSONB DEFAULT '[]', -- Array of material objects

  -- Sécurité et conseils
  safety_notes JSONB DEFAULT '[]',
  tips TEXT[],
  common_mistakes TEXT[],

  -- Métadonnées
  risk_level TEXT NOT NULL DEFAULT 'none',
  required_skills TEXT[],
  number_of_people INTEGER,

  -- État
  completed BOOLEAN DEFAULT false,
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(procedure_id, order_index)
);

-- Table: sub_steps
CREATE TABLE sub_steps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phase_id UUID NOT NULL REFERENCES phases(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  estimated_time INTEGER, -- en minutes
  tips TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(phase_id, order_index)
);

-- Table: images (metadata, les fichiers sont dans Supabase Storage)
CREATE TABLE images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  storage_path TEXT NOT NULL, -- Path in Supabase Storage
  size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  width INTEGER,
  height INTEGER,
  thumbnail_path TEXT, -- Path to thumbnail in Storage

  -- Reference (peut être lié à différentes entités)
  entity_type TEXT, -- 'procedure', 'phase', 'sub_step', 'tool'
  entity_id UUID,

  -- Annotations
  annotations JSONB DEFAULT '[]',
  description TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: procedure_templates
CREATE TABLE procedure_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  icon TEXT,
  preview_image_url TEXT,

  -- Structure template (stored as JSON)
  default_phases JSONB DEFAULT '[]',
  default_tool_ids TEXT[],
  default_materials JSONB DEFAULT '[]',

  -- Métadonnées
  usage_count INTEGER DEFAULT 0,
  last_used TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: user_preferences
CREATE TABLE user_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID, -- Pour multi-utilisateur futur

  -- Apparence
  theme TEXT DEFAULT 'auto',
  accent_color TEXT DEFAULT '#3b82f6',
  font_size TEXT DEFAULT 'normal',
  density TEXT DEFAULT 'normal',

  -- Vue par défaut
  default_view TEXT DEFAULT 'grid',

  -- Comportement
  auto_save BOOLEAN DEFAULT true,
  auto_save_interval INTEGER DEFAULT 30,
  confirm_before_delete BOOLEAN DEFAULT true,

  -- PDF par défaut
  default_pdf_config JSONB,

  -- Raccourcis clavier
  keyboard_shortcuts JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: history
CREATE TABLE history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  procedure_id UUID REFERENCES procedures(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  changes JSONB,
  snapshot JSONB, -- Full snapshot for restoration
  user_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- TABLES DE LIAISON (Many-to-Many)
-- ==========================================

-- Liaison: procedures <-> materials (au niveau global)
CREATE TABLE procedure_materials (
  procedure_id UUID REFERENCES procedures(id) ON DELETE CASCADE,
  material_id UUID REFERENCES materials(id) ON DELETE CASCADE,
  quantity DECIMAL(10, 2),
  PRIMARY KEY (procedure_id, material_id)
);

-- Liaison: phases <-> tools
CREATE TABLE phase_tools (
  phase_id UUID REFERENCES phases(id) ON DELETE CASCADE,
  tool_id UUID REFERENCES tools(id) ON DELETE CASCADE,
  PRIMARY KEY (phase_id, tool_id)
);

-- ==========================================
-- INDEXES
-- ==========================================

CREATE INDEX idx_procedures_status ON procedures(status);
CREATE INDEX idx_procedures_category ON procedures(category);
CREATE INDEX idx_procedures_difficulty ON procedures(difficulty);
CREATE INDEX idx_procedures_created_at ON procedures(created_at);
CREATE INDEX idx_procedures_updated_at ON procedures(updated_at);
CREATE INDEX idx_procedures_tags ON procedures USING GIN(tags);

CREATE INDEX idx_phases_procedure_id ON phases(procedure_id);
CREATE INDEX idx_phases_order ON phases(procedure_id, order_index);

CREATE INDEX idx_sub_steps_phase_id ON sub_steps(phase_id);
CREATE INDEX idx_sub_steps_order ON sub_steps(phase_id, order_index);

CREATE INDEX idx_images_entity ON images(entity_type, entity_id);

CREATE INDEX idx_history_procedure_id ON history(procedure_id);
CREATE INDEX idx_history_created_at ON history(created_at);

-- ==========================================
-- FUNCTIONS & TRIGGERS
-- ==========================================

-- Function: update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers pour updated_at
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tags_updated_at BEFORE UPDATE ON tags
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tools_updated_at BEFORE UPDATE ON tools
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_materials_updated_at BEFORE UPDATE ON materials
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_procedures_updated_at BEFORE UPDATE ON procedures
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_phases_updated_at BEFORE UPDATE ON phases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sub_steps_updated_at BEFORE UPDATE ON sub_steps
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_images_updated_at BEFORE UPDATE ON images
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_templates_updated_at BEFORE UPDATE ON procedure_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_preferences_updated_at BEFORE UPDATE ON user_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function: calculer le temps total d'une procédure
CREATE OR REPLACE FUNCTION calculate_procedure_total_time(proc_id UUID)
RETURNS INTEGER AS $$
DECLARE
  total INTEGER;
BEGIN
  SELECT COALESCE(SUM(estimated_time), 0) INTO total
  FROM phases
  WHERE procedure_id = proc_id;

  RETURN total;
END;
$$ LANGUAGE plpgsql;

-- Function: calculer le coût total d'une procédure
CREATE OR REPLACE FUNCTION calculate_procedure_total_cost(proc_id UUID)
RETURNS DECIMAL AS $$
DECLARE
  total DECIMAL;
BEGIN
  SELECT COALESCE(SUM(m.price * pm.quantity), 0) INTO total
  FROM procedure_materials pm
  JOIN materials m ON pm.material_id = m.id
  WHERE pm.procedure_id = proc_id;

  RETURN total;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- ROW LEVEL SECURITY (RLS)
-- ==========================================

-- Activer RLS sur toutes les tables
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE procedures ENABLE ROW LEVEL SECURITY;
ALTER TABLE phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE sub_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE images ENABLE ROW LEVEL SECURITY;
ALTER TABLE procedure_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE history ENABLE ROW LEVEL SECURITY;
ALTER TABLE procedure_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE phase_tools ENABLE ROW LEVEL SECURITY;

-- Policies: Pour l'instant, accès public (à ajuster selon vos besoins)
-- Vous pouvez ajouter l'authentification plus tard

CREATE POLICY "Enable all access for categories" ON categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for tags" ON tags FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for tools" ON tools FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for materials" ON materials FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for procedures" ON procedures FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for phases" ON phases FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for sub_steps" ON sub_steps FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for images" ON images FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for templates" ON procedure_templates FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for preferences" ON user_preferences FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for history" ON history FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for procedure_materials" ON procedure_materials FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for phase_tools" ON phase_tools FOR ALL USING (true) WITH CHECK (true);

-- ==========================================
-- DONNÉES INITIALES
-- ==========================================

-- Catégories par défaut
INSERT INTO categories (name, description, color, icon) VALUES
  ('Électricité', 'Travaux électriques', '#fbbf24', '⚡'),
  ('Plomberie', 'Travaux de plomberie', '#3b82f6', '🚰'),
  ('Menuiserie', 'Travaux de menuiserie et bois', '#92400e', '🪚'),
  ('Peinture', 'Peinture et décoration', '#ec4899', '🎨'),
  ('Maçonnerie', 'Travaux de maçonnerie', '#6b7280', '🧱'),
  ('Jardinage', 'Travaux de jardinage et extérieur', '#10b981', '🌱');

-- Préférences par défaut
INSERT INTO user_preferences (
  theme,
  accent_color,
  font_size,
  density,
  default_view,
  auto_save,
  auto_save_interval,
  confirm_before_delete,
  default_pdf_config
) VALUES (
  'dark',
  '#3b82f6',
  'normal',
  'normal',
  'grid',
  true,
  30,
  true,
  '{
    "pageSize": "a4",
    "orientation": "portrait",
    "columns": 1,
    "imageQuality": "high",
    "includeTableOfContents": true,
    "includeCoverPage": true,
    "includeToolIndex": true,
    "includeMaterialList": true,
    "includePrivateNotes": false,
    "header": {"enabled": true},
    "footer": {
      "enabled": true,
      "showPageNumbers": true,
      "showDate": true,
      "showVersion": true
    },
    "primaryColor": "#1f2937",
    "accentColor": "#3b82f6",
    "fontFamily": "Helvetica"
  }'::jsonb
);
