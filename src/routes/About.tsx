import { usePageMeta } from '../lib/seo'

const About = () => {
  usePageMeta({
    title: '서비스 소개 | shorty.link',
    description: '커스텀 도메인 단축 링크, 회원 관리, 클릭 통계를 제공하는 shorty.link 소개',
    canonical: `${(import.meta.env.VITE_SITE_URL as string | undefined) ?? window.location.origin}/about`,
  })

  return (
    <div className="max-w-3xl space-y-4 text-slate-700">
      <h1>서비스 소개</h1>
      <p>
        shorty.link는 커스텀 도메인 기반 단축 링크, 멤버 관리, 클릭 통계를 제공하는 회원제 숏링크
        서비스입니다.
      </p>
      <p>관리자는 전체 링크와 도메인, 로그를 관리하고, 사용자는 본인 링크를 안전하게 운영할 수 있습니다.</p>
    </div>
  )
}

export default About

