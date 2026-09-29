-- Initial Roadmap schema (database name is `roadmap`; schema is also `roadmap`).
-- Applied by docker-entrypoint when roadmap.applications does not exist.

CREATE SCHEMA IF NOT EXISTS roadmap;

CREATE TABLE IF NOT EXISTS roadmap.applications (
    id integer NOT NULL,
    slug character varying(100) NOT NULL,
    name character varying(200) NOT NULL,
    description text,
    repo_url character varying(500),
    tech_stack jsonb,
    layer character varying(50) DEFAULT 'platform'::character varying NOT NULL,
    status character varying(50) DEFAULT 'active'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);

CREATE SEQUENCE IF NOT EXISTS roadmap.applications_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE roadmap.applications_id_seq OWNED BY roadmap.applications.id;
ALTER TABLE ONLY roadmap.applications ALTER COLUMN id SET DEFAULT nextval('roadmap.applications_id_seq'::regclass);

CREATE TABLE IF NOT EXISTS roadmap.objectives (
    id integer NOT NULL,
    name character varying(300) NOT NULL,
    description text,
    year integer NOT NULL,
    priority integer DEFAULT 3 NOT NULL,
    metrics jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);

CREATE SEQUENCE IF NOT EXISTS roadmap.objectives_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE roadmap.objectives_id_seq OWNED BY roadmap.objectives.id;
ALTER TABLE ONLY roadmap.objectives ALTER COLUMN id SET DEFAULT nextval('roadmap.objectives_id_seq'::regclass);

CREATE TABLE IF NOT EXISTS roadmap.initiatives (
    id integer NOT NULL,
    name character varying(500) NOT NULL,
    description text,
    type character varying(50) DEFAULT 'feature'::character varying NOT NULL,
    status character varying(50) DEFAULT 'planned'::character varying NOT NULL,
    category character varying(50) DEFAULT 'PLATFORM'::character varying NOT NULL,
    year integer NOT NULL,
    start_quarter character varying(10),
    end_quarter character varying(10),
    effort character varying(10),
    impact integer,
    assignees text,
    application_id integer,
    objective_id integer,
    jira_epic_key character varying(50),
    github_milestone character varying(200),
    linked_prs text,
    ai_priority_score double precision,
    ai_rationale text,
    manually_edited integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);

CREATE SEQUENCE IF NOT EXISTS roadmap.initiatives_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE roadmap.initiatives_id_seq OWNED BY roadmap.initiatives.id;
ALTER TABLE ONLY roadmap.initiatives ALTER COLUMN id SET DEFAULT nextval('roadmap.initiatives_id_seq'::regclass);

CREATE TABLE IF NOT EXISTS roadmap.capabilities (
    id integer NOT NULL,
    application_id integer NOT NULL,
    name character varying(300) NOT NULL,
    category character varying(50) NOT NULL,
    description text,
    maturity character varying(50) DEFAULT 'stable'::character varying NOT NULL,
    gaps text,
    integrations text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);

CREATE SEQUENCE IF NOT EXISTS roadmap.capabilities_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE roadmap.capabilities_id_seq OWNED BY roadmap.capabilities.id;
ALTER TABLE ONLY roadmap.capabilities ALTER COLUMN id SET DEFAULT nextval('roadmap.capabilities_id_seq'::regclass);

CREATE TABLE IF NOT EXISTS roadmap.gaps (
    id integer NOT NULL,
    objective_id integer NOT NULL,
    application_id integer,
    description text NOT NULL,
    severity character varying(20) DEFAULT 'medium'::character varying NOT NULL,
    suggested_initiatives jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);

CREATE SEQUENCE IF NOT EXISTS roadmap.gaps_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE roadmap.gaps_id_seq OWNED BY roadmap.gaps.id;
ALTER TABLE ONLY roadmap.gaps ALTER COLUMN id SET DEFAULT nextval('roadmap.gaps_id_seq'::regclass);

CREATE TABLE IF NOT EXISTS roadmap.github_sync (
    id integer NOT NULL,
    repo character varying(200) NOT NULL,
    open_prs integer DEFAULT 0 NOT NULL,
    last_release character varying(100),
    last_release_date timestamp without time zone,
    open_issues integer DEFAULT 0 NOT NULL,
    default_branch character varying(100),
    last_synced_at timestamp without time zone DEFAULT now() NOT NULL
);

CREATE SEQUENCE IF NOT EXISTS roadmap.github_sync_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE roadmap.github_sync_id_seq OWNED BY roadmap.github_sync.id;
ALTER TABLE ONLY roadmap.github_sync ALTER COLUMN id SET DEFAULT nextval('roadmap.github_sync_id_seq'::regclass);

CREATE TABLE IF NOT EXISTS roadmap.jira_sync (
    id integer NOT NULL,
    epic_key character varying(50) NOT NULL,
    summary text,
    status character varying(100),
    assignee character varying(200),
    story_count integer DEFAULT 0 NOT NULL,
    done_count integer DEFAULT 0 NOT NULL,
    last_synced_at timestamp without time zone DEFAULT now() NOT NULL
);

CREATE SEQUENCE IF NOT EXISTS roadmap.jira_sync_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE roadmap.jira_sync_id_seq OWNED BY roadmap.jira_sync.id;
ALTER TABLE ONLY roadmap.jira_sync ALTER COLUMN id SET DEFAULT nextval('roadmap.jira_sync_id_seq'::regclass);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'applications_pkey') THEN
    ALTER TABLE ONLY roadmap.applications ADD CONSTRAINT applications_pkey PRIMARY KEY (id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'applications_slug_unique') THEN
    ALTER TABLE ONLY roadmap.applications ADD CONSTRAINT applications_slug_unique UNIQUE (slug);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'objectives_pkey') THEN
    ALTER TABLE ONLY roadmap.objectives ADD CONSTRAINT objectives_pkey PRIMARY KEY (id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'objectives_name_year_unique') THEN
    CREATE UNIQUE INDEX objectives_name_year_unique ON roadmap.objectives USING btree (name, year);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'initiatives_pkey') THEN
    ALTER TABLE ONLY roadmap.initiatives ADD CONSTRAINT initiatives_pkey PRIMARY KEY (id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'initiatives_name_year_unique') THEN
    CREATE UNIQUE INDEX initiatives_name_year_unique ON roadmap.initiatives USING btree (name, year);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'capabilities_pkey') THEN
    ALTER TABLE ONLY roadmap.capabilities ADD CONSTRAINT capabilities_pkey PRIMARY KEY (id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'gaps_pkey') THEN
    ALTER TABLE ONLY roadmap.gaps ADD CONSTRAINT gaps_pkey PRIMARY KEY (id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'github_sync_pkey') THEN
    ALTER TABLE ONLY roadmap.github_sync ADD CONSTRAINT github_sync_pkey PRIMARY KEY (id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'github_sync_repo_unique') THEN
    ALTER TABLE ONLY roadmap.github_sync ADD CONSTRAINT github_sync_repo_unique UNIQUE (repo);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'jira_sync_pkey') THEN
    ALTER TABLE ONLY roadmap.jira_sync ADD CONSTRAINT jira_sync_pkey PRIMARY KEY (id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'jira_sync_epic_key_unique') THEN
    ALTER TABLE ONLY roadmap.jira_sync ADD CONSTRAINT jira_sync_epic_key_unique UNIQUE (epic_key);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'capabilities_application_id_applications_id_fk') THEN
    ALTER TABLE ONLY roadmap.capabilities
      ADD CONSTRAINT capabilities_application_id_applications_id_fk
      FOREIGN KEY (application_id) REFERENCES roadmap.applications(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'gaps_application_id_applications_id_fk') THEN
    ALTER TABLE ONLY roadmap.gaps
      ADD CONSTRAINT gaps_application_id_applications_id_fk
      FOREIGN KEY (application_id) REFERENCES roadmap.applications(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'gaps_objective_id_objectives_id_fk') THEN
    ALTER TABLE ONLY roadmap.gaps
      ADD CONSTRAINT gaps_objective_id_objectives_id_fk
      FOREIGN KEY (objective_id) REFERENCES roadmap.objectives(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'initiatives_application_id_applications_id_fk') THEN
    ALTER TABLE ONLY roadmap.initiatives
      ADD CONSTRAINT initiatives_application_id_applications_id_fk
      FOREIGN KEY (application_id) REFERENCES roadmap.applications(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'initiatives_objective_id_objectives_id_fk') THEN
    ALTER TABLE ONLY roadmap.initiatives
      ADD CONSTRAINT initiatives_objective_id_objectives_id_fk
      FOREIGN KEY (objective_id) REFERENCES roadmap.objectives(id) ON DELETE SET NULL;
  END IF;
END
$$;
