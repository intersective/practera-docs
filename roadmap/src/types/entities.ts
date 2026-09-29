export interface Application {
  id: number;
  slug: string;
  name: string;
  description?: string | null;
  repoUrl?: string | null;
  techStack?: string[] | null;
  layer: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Capability {
  id: number;
  applicationId: number;
  name: string;
  category: string;
  description?: string | null;
  maturity: string;
  gaps?: string | null;
  integrations?: string | null;
  createdAt: Date;
  updatedAt: Date;
  application?: Application;
}

export interface Objective {
  id: number;
  name: string;
  description?: string | null;
  year: number;
  priority: number;
  metrics?: string[] | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Initiative {
  id: number;
  name: string;
  description?: string | null;
  type: string;
  status: string;
  category: string;
  year: number;
  startQuarter?: string | null;
  endQuarter?: string | null;
  effort?: string | null;
  impact?: number | null;
  assignees?: string | null;
  applicationId?: number | null;
  objectiveId?: number | null;
  jiraEpicKey?: string | null;
  githubMilestone?: string | null;
  aiPriorityScore?: number | null;
  aiRationale?: string | null;
  customerVisible?: number | null;
  customerSummary?: string | null;
  createdAt: Date;
  updatedAt: Date;
  application?: Application;
  objective?: Objective;
  jiraData?: JiraSync;
}

export interface Gap {
  id: number;
  objectiveId: number;
  applicationId?: number | null;
  description: string;
  severity: string;
  suggestedInitiatives?: string[] | null;
  createdAt: Date;
  objective?: Objective;
  application?: Application;
}

export interface JiraSync {
  id: number;
  epicKey: string;
  summary?: string | null;
  status?: string | null;
  assignee?: string | null;
  storyCount: number;
  doneCount: number;
  lastSyncedAt: Date;
}

export interface GitHubSync {
  id: number;
  repo: string;
  openPrs: number;
  lastRelease?: string | null;
  lastReleaseDate?: Date | null;
  openIssues: number;
  defaultBranch?: string | null;
  lastSyncedAt: Date;
}

export interface AICapabilityResult {
  applicationSlug: string;
  capabilities: {
    name: string;
    category: string;
    description: string;
    maturity: string;
    gaps: string;
    integrations: string;
  }[];
}

export interface AIPrioritizationResult {
  initiatives: {
    id?: number;
    name: string;
    score: number;
    rationale: string;
    effort: string;
    impact: number;
  }[];
  gaps: {
    objectiveName: string;
    applicationName?: string;
    description: string;
    severity: string;
    suggestedInitiatives: string[];
  }[];
}
