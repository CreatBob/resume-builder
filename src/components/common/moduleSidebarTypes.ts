// author: Bob
export type PrimaryMenuKey = 'resume-editor' | 'ai-interviewer' | 'knowledge-base'

export interface PrimaryMenuItem {
  key: PrimaryMenuKey
  label: string
  iconPath: string
}

export const DEFAULT_PRIMARY_MENUS: PrimaryMenuItem[] = [
  {
    key: 'resume-editor',
    label: '简历编辑',
    iconPath:
      'M15 3H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V8Zm0 0v5h5M9 13h6M9 17h4',
  },
  {
    key: 'ai-interviewer',
    label: 'AI面试',
    iconPath:
      'M9 3h6M12 3v3m-6 4h12a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-3l-3 2-3-2H6a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2Zm3 3h.01M15 15h.01',
  },
  {
    key: 'knowledge-base',
    label: '知识库',
    iconPath:
      'M6 5.5A2.5 2.5 0 0 1 8.5 3H18v15.5A2.5 2.5 0 0 0 15.5 16H6Zm0 0v11A2.5 2.5 0 0 0 8.5 19H18M10 7h4M10 10h4M10 13h3',
  },
]
