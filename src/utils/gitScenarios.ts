export type DangerLevel = 'safe' | 'caution' | 'dangerous';

export interface ScenarioInputDef {
  name: string;
  type: 'text' | 'number' | 'select' | 'checkbox';
  labelKey: string;
  placeholderKey?: string;
  defaultValue: any;
  options?: { labelKey: string; value: string }[];
}

export interface GitScenario {
  id: string;
  category: 'commits' | 'undo' | 'branches' | 'stash' | 'rescue' | 'remote';
  titleKey: string;
  descKey: string;
  dangerLevel: DangerLevel;
  inputs: ScenarioInputDef[];
  generate(params: Record<string, any>): string;
}

export interface GitCheatSheetItem {
  id: string;
  category: 'everyday' | 'undo' | 'branching' | 'remote' | 'advanced';
  titleKey: string;
  descKey: string;
  command: string;
  dangerLevel: DangerLevel;
}

export const GIT_SCENARIOS: GitScenario[] = [
  // 1. Amend Last Commit
  {
    id: 'amend_commit',
    category: 'commits',
    titleKey: 'scenAmendTitle',
    descKey: 'scenAmendDesc',
    dangerLevel: 'caution',
    inputs: [
      {
        name: 'mode',
        type: 'select',
        labelKey: 'fieldAmendMode',
        defaultValue: 'no-edit',
        options: [
          { labelKey: 'optAmendNoEdit', value: 'no-edit' },
          { labelKey: 'optAmendNewMsg', value: 'new-msg' }
        ]
      },
      {
        name: 'newMessage',
        type: 'text',
        labelKey: 'fieldCommitMessage',
        placeholderKey: 'phCommitMessage',
        defaultValue: 'chore: updated recent changes'
      },
      {
        name: 'includeAll',
        type: 'checkbox',
        labelKey: 'fieldStageAll',
        defaultValue: true
      }
    ],
    generate: (p) => {
      const stageCmd = p.includeAll ? 'git add -A && ' : '';
      if (p.mode === 'no-edit') {
        return `${stageCmd}git commit --amend --no-edit`;
      }
      const safeMsg = (p.newMessage || '').replace(/"/g, '\\"');
      return `${stageCmd}git commit --amend -m "${safeMsg}"`;
    }
  },

  // 2. Undo Local Commits (Soft / Mixed / Hard)
  {
    id: 'undo_commits',
    category: 'undo',
    titleKey: 'scenUndoCommitTitle',
    descKey: 'scenUndoCommitDesc',
    dangerLevel: 'caution',
    inputs: [
      {
        name: 'resetType',
        type: 'select',
        labelKey: 'fieldResetType',
        defaultValue: 'soft',
        options: [
          { labelKey: 'optResetSoft', value: 'soft' },
          { labelKey: 'optResetMixed', value: 'mixed' },
          { labelKey: 'optResetHard', value: 'hard' }
        ]
      },
      {
        name: 'count',
        type: 'number',
        labelKey: 'fieldCommitCount',
        defaultValue: 1
      }
    ],
    generate: (p) => {
      const count = Math.max(1, parseInt(p.count, 10) || 1);
      const mode = p.resetType || 'soft';
      return `git reset --${mode} HEAD~${count}`;
    }
  },

  // 3. Stash Changes
  {
    id: 'stash_save',
    category: 'stash',
    titleKey: 'scenStashTitle',
    descKey: 'scenStashDesc',
    dangerLevel: 'safe',
    inputs: [
      {
        name: 'action',
        type: 'select',
        labelKey: 'fieldStashAction',
        defaultValue: 'push',
        options: [
          { labelKey: 'optStashPush', value: 'push' },
          { labelKey: 'optStashPop', value: 'pop' },
          { labelKey: 'optStashList', value: 'list' },
          { labelKey: 'optStashApply', value: 'apply' },
          { labelKey: 'optStashDrop', value: 'drop' }
        ]
      },
      {
        name: 'message',
        type: 'text',
        labelKey: 'fieldStashMessage',
        placeholderKey: 'phStashMessage',
        defaultValue: 'WIP: work in progress'
      },
      {
        name: 'includeUntracked',
        type: 'checkbox',
        labelKey: 'fieldIncludeUntracked',
        defaultValue: true
      }
    ],
    generate: (p) => {
      if (p.action === 'pop') return 'git stash pop';
      if (p.action === 'list') return 'git stash list';
      if (p.action === 'apply') return 'git stash apply';
      if (p.action === 'drop') return 'git stash drop';

      const uFlag = p.includeUntracked ? '-u ' : '';
      const msg = p.message ? `-m "${p.message.replace(/"/g, '\\"')}"` : '';
      return `git stash push ${uFlag}${msg}`.trim();
    }
  },

  // 4. Squash Recent Commits
  {
    id: 'squash_commits',
    category: 'commits',
    titleKey: 'scenSquashTitle',
    descKey: 'scenSquashDesc',
    dangerLevel: 'caution',
    inputs: [
      {
        name: 'count',
        type: 'number',
        labelKey: 'fieldCommitCount',
        defaultValue: 3
      },
      {
        name: 'newMessage',
        type: 'text',
        labelKey: 'fieldCommitMessage',
        placeholderKey: 'phCommitMessage',
        defaultValue: 'feat: squashed feature commits'
      }
    ],
    generate: (p) => {
      const count = Math.max(2, parseInt(p.count, 10) || 2);
      const msg = (p.newMessage || 'feat: squashed changes').replace(/"/g, '\\"');
      return `git reset --soft HEAD~${count} && git commit -m "${msg}"`;
    }
  },

  // 5. Create & Switch to Branch
  {
    id: 'branch_create',
    category: 'branches',
    titleKey: 'scenBranchCreateTitle',
    descKey: 'scenBranchCreateDesc',
    dangerLevel: 'safe',
    inputs: [
      {
        name: 'branchName',
        type: 'text',
        labelKey: 'fieldBranchName',
        placeholderKey: 'phBranchName',
        defaultValue: 'feature/new-service'
      },
      {
        name: 'fromBase',
        type: 'text',
        labelKey: 'fieldBaseBranch',
        placeholderKey: 'phBaseBranch',
        defaultValue: ''
      }
    ],
    generate: (p) => {
      const name = (p.branchName || 'feature-branch').trim();
      const base = p.fromBase ? ` ${p.fromBase.trim()}` : '';
      return `git checkout -b ${name}${base}`;
    }
  },

  // 6. Delete Branch (Local & Remote)
  {
    id: 'branch_delete',
    category: 'branches',
    titleKey: 'scenBranchDeleteTitle',
    descKey: 'scenBranchDeleteDesc',
    dangerLevel: 'dangerous',
    inputs: [
      {
        name: 'branchName',
        type: 'text',
        labelKey: 'fieldBranchName',
        placeholderKey: 'phBranchName',
        defaultValue: 'old-feature'
      },
      {
        name: 'target',
        type: 'select',
        labelKey: 'fieldDeleteTarget',
        defaultValue: 'local',
        options: [
          { labelKey: 'optDeleteLocalSafe', value: 'local' },
          { labelKey: 'optDeleteLocalForce', value: 'local-force' },
          { labelKey: 'optDeleteRemote', value: 'remote' },
          { labelKey: 'optDeleteBoth', value: 'both' }
        ]
      }
    ],
    generate: (p) => {
      const name = (p.branchName || 'branch-name').trim();
      if (p.target === 'local') return `git branch -d ${name}`;
      if (p.target === 'local-force') return `git branch -D ${name}`;
      if (p.target === 'remote') return `git push origin --delete ${name}`;
      return `git branch -D ${name} && git push origin --delete ${name}`;
    }
  },

  // 7. Discard Uncommitted Changes
  {
    id: 'discard_changes',
    category: 'undo',
    titleKey: 'scenDiscardTitle',
    descKey: 'scenDiscardDesc',
    dangerLevel: 'dangerous',
    inputs: [
      {
        name: 'scope',
        type: 'select',
        labelKey: 'fieldDiscardScope',
        defaultValue: 'all',
        options: [
          { labelKey: 'optDiscardAll', value: 'all' },
          { labelKey: 'optDiscardFile', value: 'file' },
          { labelKey: 'optUnstageOnly', value: 'unstage' }
        ]
      },
      {
        name: 'filePath',
        type: 'text',
        labelKey: 'fieldFilePath',
        placeholderKey: 'phFilePath',
        defaultValue: 'src/index.ts'
      },
      {
        name: 'cleanUntracked',
        type: 'checkbox',
        labelKey: 'fieldCleanUntracked',
        defaultValue: true
      }
    ],
    generate: (p) => {
      if (p.scope === 'unstage') {
        return p.filePath ? `git restore --staged ${p.filePath}` : 'git restore --staged .';
      }
      if (p.scope === 'file') {
        return `git restore ${p.filePath || '.'}`;
      }
      const clean = p.cleanUntracked ? ' && git clean -fd' : '';
      return `git restore .${clean}`;
    }
  },

  // 8. Cherry-Pick Commit
  {
    id: 'cherry_pick',
    category: 'commits',
    titleKey: 'scenCherryPickTitle',
    descKey: 'scenCherryPickDesc',
    dangerLevel: 'caution',
    inputs: [
      {
        name: 'commitHash',
        type: 'text',
        labelKey: 'fieldCommitHash',
        placeholderKey: 'phCommitHash',
        defaultValue: 'abc1234'
      },
      {
        name: 'noCommit',
        type: 'checkbox',
        labelKey: 'fieldNoCommit',
        defaultValue: false
      }
    ],
    generate: (p) => {
      const hash = (p.commitHash || 'hash').trim();
      const nFlag = p.noCommit ? '-n ' : '';
      return `git cherry-pick ${nFlag}${hash}`.trim();
    }
  },

  // 9. Recover Lost Commit (Reflog)
  {
    id: 'reflog_recover',
    category: 'rescue',
    titleKey: 'scenReflogTitle',
    descKey: 'scenReflogDesc',
    dangerLevel: 'safe',
    inputs: [
      {
        name: 'step',
        type: 'select',
        labelKey: 'fieldReflogStep',
        defaultValue: 'inspect',
        options: [
          { labelKey: 'optReflogView', value: 'inspect' },
          { labelKey: 'optReflogBranch', value: 'recover' }
        ]
      },
      {
        name: 'commitHash',
        type: 'text',
        labelKey: 'fieldCommitHash',
        placeholderKey: 'phCommitHash',
        defaultValue: 'HEAD@{1}'
      },
      {
        name: 'recoveredBranch',
        type: 'text',
        labelKey: 'fieldRecoveredBranchName',
        placeholderKey: 'phBranchName',
        defaultValue: 'recovered-branch'
      }
    ],
    generate: (p) => {
      if (p.step === 'inspect') {
        return 'git reflog --date=relative -n 25';
      }
      const hash = (p.commitHash || 'HEAD@{1}').trim();
      const branch = (p.recoveredBranch || 'recovery').trim();
      return `git branch ${branch} ${hash} && git checkout ${branch}`;
    }
  },

  // 10. Remote Safe Force Push & Sync
  {
    id: 'remote_sync',
    category: 'remote',
    titleKey: 'scenRemoteTitle',
    descKey: 'scenRemoteDesc',
    dangerLevel: 'caution',
    inputs: [
      {
        name: 'action',
        type: 'select',
        labelKey: 'fieldRemoteAction',
        defaultValue: 'lease-push',
        options: [
          { labelKey: 'optPushWithLease', value: 'lease-push' },
          { labelKey: 'optPruneBranches', value: 'prune' },
          { labelKey: 'optRebasePull', value: 'pull-rebase' }
        ]
      },
      {
        name: 'branchName',
        type: 'text',
        labelKey: 'fieldBranchName',
        placeholderKey: 'phBranchName',
        defaultValue: 'main'
      }
    ],
    generate: (p) => {
      const branch = (p.branchName || 'main').trim();
      if (p.action === 'prune') return 'git fetch --prune origin';
      if (p.action === 'pull-rebase') return `git pull --rebase origin ${branch}`;
      return `git push --force-with-lease origin ${branch}`;
    }
  }
];

export const GIT_CHEAT_SHEET: GitCheatSheetItem[] = [
  {
    id: 'cs_discard_all',
    category: 'undo',
    titleKey: 'csDiscardAllTitle',
    descKey: 'csDiscardAllDesc',
    command: 'git restore . && git clean -fd',
    dangerLevel: 'dangerous'
  },
  {
    id: 'cs_undo_last_commit_soft',
    category: 'undo',
    titleKey: 'csUndoSoftTitle',
    descKey: 'csUndoSoftDesc',
    command: 'git reset --soft HEAD~1',
    dangerLevel: 'safe'
  },
  {
    id: 'cs_undo_last_commit_hard',
    category: 'undo',
    titleKey: 'csUndoHardTitle',
    descKey: 'csUndoHardDesc',
    command: 'git reset --hard HEAD~1',
    dangerLevel: 'dangerous'
  },
  {
    id: 'cs_unstage_file',
    category: 'undo',
    titleKey: 'csUnstageTitle',
    descKey: 'csUnstageDesc',
    command: 'git restore --staged <file>',
    dangerLevel: 'safe'
  },
  {
    id: 'cs_rename_branch',
    category: 'branching',
    titleKey: 'csRenameBranchTitle',
    descKey: 'csRenameBranchDesc',
    command: 'git branch -m <old-name> <new-name>',
    dangerLevel: 'safe'
  },
  {
    id: 'cs_list_branches_remote',
    category: 'branching',
    titleKey: 'csListBranchesTitle',
    descKey: 'csListBranchesDesc',
    command: 'git branch -a -vv',
    dangerLevel: 'safe'
  },
  {
    id: 'cs_log_pretty',
    category: 'everyday',
    titleKey: 'csLogPrettyTitle',
    descKey: 'csLogPrettyDesc',
    command: 'git log --graph --oneline --decorate --all -n 20',
    dangerLevel: 'safe'
  },
  {
    id: 'cs_stash_untracked',
    category: 'everyday',
    titleKey: 'csStashUntrackedTitle',
    descKey: 'csStashUntrackedDesc',
    command: 'git stash push -u -m "WIP"',
    dangerLevel: 'safe'
  },
  {
    id: 'cs_revert_commit',
    category: 'undo',
    titleKey: 'csRevertCommitTitle',
    descKey: 'csRevertCommitDesc',
    command: 'git revert <commit-hash>',
    dangerLevel: 'safe'
  },
  {
    id: 'cs_fetch_prune',
    category: 'remote',
    titleKey: 'csFetchPruneTitle',
    descKey: 'csFetchPruneDesc',
    command: 'git fetch -p && git remote prune origin',
    dangerLevel: 'safe'
  },
  {
    id: 'cs_reflog_inspect',
    category: 'advanced',
    titleKey: 'csReflogInspectTitle',
    descKey: 'csReflogInspectDesc',
    command: 'git reflog --relative-date -n 20',
    dangerLevel: 'safe'
  },
  {
    id: 'cs_diff_staged',
    category: 'everyday',
    titleKey: 'csDiffStagedTitle',
    descKey: 'csDiffStagedDesc',
    command: 'git diff --cached',
    dangerLevel: 'safe'
  }
];
