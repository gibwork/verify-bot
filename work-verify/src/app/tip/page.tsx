import { Suspense } from "react";
import { getVaultByUser } from "@//actions/vault";
import { TipContent } from "@//app/tip/components/tip-content";
import { ErrorDisplay } from "@/app/tip/components/error-display";

type TipPageProps = {
  searchParams: Promise<{
    receiver_user_id?: string;
    receiver_username?: string;
    amount?: string;
    server_id?: string;
  }>;
};

export default async function TipPage(params: TipPageProps) {
  const searchParams = await params.searchParams;
  const receiverDiscordId = searchParams.receiver_user_id;
  const receiverUsername = searchParams.receiver_username;
  const amount = searchParams.amount;
  
  // Validate required parameters
  const missingParams = [];
  if (!receiverDiscordId) missingParams.push('receiver_user_id');
  if (!receiverUsername) missingParams.push('receiver_username');
  if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) missingParams.push('amount');
  
  // Only fetch vault if we have a valid receiver ID
  const receiverVault = receiverDiscordId ? await getVaultByUser(receiverDiscordId) : null;
  
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 md:p-24">
      <Suspense fallback={<div>Loading...</div>}>
        {missingParams.length > 0 ? (
          <ErrorDisplay missingParams={missingParams} />
        ) : (
          <TipContent receiverVault={receiverVault?.id} />
        )}
      </Suspense>
    </main>
  );
}
