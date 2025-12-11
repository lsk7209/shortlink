import { usePageMeta } from '../lib/seo'

const Privacy = () => {
  usePageMeta({
    title: '개인정보 처리방침 | shorty.link',
    description: 'shorty.link 개인정보 처리방침 안내',
    canonical: `${(import.meta.env.VITE_SITE_URL as string | undefined) ?? window.location.origin}/privacy`,
  })

  return (
    <div className="max-w-3xl space-y-4 text-slate-700">
      <h1>개인정보 처리방침</h1>
      <p>단축 링크 서비스 제공을 위해 이메일, 프로필 정보, 생성한 링크 메타데이터를 수집·보관합니다.</p>
      <ul>
        <li>보관 기간: 탈퇴 또는 목적 달성 시 파기</li>
        <li>제3자 제공: 없음</li>
        <li>처리 위탁: 클라우드/호스팅(Vercel, Supabase) 한정</li>
      </ul>
    </div>
  )
}

export default Privacy

