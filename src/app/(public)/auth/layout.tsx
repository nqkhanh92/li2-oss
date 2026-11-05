import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card'
import { getCasdoorLoginUrl } from '@/shared/lib/server-utils'
import { redirect } from 'next/navigation'

const AuthLayout = ({ children }: { children: React.ReactNode }) => {
  // return (
  //   <div className="flex h-screen items-center justify-center">
  //     <div className="p-5 w-full md:w-1/2 lg:w-1/3">
  //       <Card className="mx-auto max-w-sm my-auto">
  //         <CardHeader>
  //           <CardTitle className="text-2xl">
  //             <Image
  //               src="/images/logo.svg"
  //               width={200}
  //               height={80}
  //               alt="logo"
  //               className="brightness-0"
  //             />
  //           </CardTitle>
  //         </CardHeader>
  //         <CardContent>{children}</CardContent>
  //       </Card>
  //     </div>
  //   </div>
  // );
  return <>{children}</>
}

export default AuthLayout
