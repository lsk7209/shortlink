import { usePageMeta } from '../lib/seo'

const Terms = () => {
  usePageMeta({
    title: '이용 약관 | shorty.link',
    description: 'shorty.link 이용 약관 안내',
    canonical: `${(import.meta.env.VITE_SITE_URL as string | undefined) ?? window.location.origin}/terms`,
  })

  return (
    <div className="max-w-3xl space-y-4 text-slate-700">
      <h1>이용 약관</h1>
      <p>서비스 이용 시 다음을 준수해 주세요.</p>
      <ul>
        <li>불법, 스팸, 악성 코드 배포 목적의 사용을 금지합니다.</li>
        <li>정책 위반 링크는 사전 통보 없이 비활성화될 수 있습니다.</li>
        <li>관리자는 정책 유지를 위해 필요 시 링크를 제한할 수 있습니다.</li>
      </ul>
    </div>
  )
}

export default Terms

