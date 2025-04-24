import { PermissionFlagsBits } from 'discord.js';
import { client } from '../config';
import { 
  getAllServers, 
  getServerHolders, 
  updateHolderData,
  checkAnyWalletHasSufficientBalanceNumber 
} from '../utils';

export async function checkAllBalances() {
  const logPrefix = "[Balance Check]";
  let serversChecked = 0;
  let usersChecked = 0;
  let usersProcessed = 0;
  let roleUpdates = 0;
  let dbUpdates = 0;

  try {
    const servers = await getAllServers();
    
    if (!servers || servers.length === 0) {
      return;
    }

    for (const serverConfig of servers) {
      serversChecked++;
      const {
        server_id: guildId,
        token_address: tokenAddress,
        required_balance: requiredBalanceStr,
        role_id: roleId,
        rpc_url: rpcUrl,
      } = serverConfig;
      const serverLogPrefix = `${logPrefix} [Guild ${guildId}]`;

      let requiredBalanceNum: number;
      try {
        requiredBalanceNum = Number(requiredBalanceStr);
        if (isNaN(requiredBalanceNum) || requiredBalanceNum < 0)
          throw new Error("Invalid balance");
      } catch {
        console.error(
          `${serverLogPrefix} Invalid required_balance '${requiredBalanceStr}'. Skipping.`
        );
        continue;
      }
      if (requiredBalanceNum > Number.MAX_SAFE_INTEGER)
        console.warn(
          `${serverLogPrefix} [Precision Warning] Required balance ${requiredBalanceNum} exceeds safe limits.`
        );

      const guild = client.guilds.cache.get(guildId);
      if (!guild) {
        continue;
      }

      if (!guild.members.me) {
        console.warn(
          `${serverLogPrefix} Bot member object not found in cache. Skipping role checks for this guild.`
        );
        continue;
      }

      const role = guild.roles.cache.get(roleId);
      if (!role) {
        console.warn(`${serverLogPrefix} Role ${roleId} not found. Skipping.`);
        continue;
      }

      let canManageRoles = false;
      if (!guild.members.me.permissions.has(PermissionFlagsBits.ManageRoles)) {
        console.warn(
          `${serverLogPrefix} Bot lacks ManageRoles permission. Cannot update roles.`
        );
      } else if (
        role.position >= guild.members.me.roles.highest.position &&
        guild.ownerId !== client.user?.id
      ) {
        console.warn(
          `${serverLogPrefix} Role ${role.name} (${roleId}) is too high. Cannot manage.`
        );
      } else {
        canManageRoles = true;
      }

      const holders = await getServerHolders(guildId);

      if (!holders || holders.length === 0) {
        continue;
      }

      usersProcessed += holders.length;
      for (const holder of holders) {
        usersChecked++;
        const userLogPrefix = `${serverLogPrefix} [User ${holder.discord_user_id}]`;
        let member = null;

        try {
          member = await guild.members
            .fetch(holder.discord_user_id)
            .catch(() => null);

          if (!member) {
            if (holder.active) {
              const success = await updateHolderData(holder.discord_user_id, guildId, { 
                active: false 
              });
              
              if (!success) {
                console.error(
                  `${userLogPrefix} Failed to mark user (left guild) as inactive`
                );
              } else {
                console.log(
                  `${userLogPrefix} Marked ${holder.username} as inactive (left guild).`
                );
                dbUpdates++;
              }
            }
            continue;
          }

          const hasSufficientBalance =
            await checkAnyWalletHasSufficientBalanceNumber(
              holder.addresses,
              tokenAddress,
              requiredBalanceNum,
              rpcUrl
            );

          const currentRoleStatus = member.roles.cache.has(roleId);
          const needsDbUpdate =
            holder.active !== hasSufficientBalance ||
            holder.username !== member.user.username;
          let roleUpdatedThisCheck = false;

          if (canManageRoles) {
            if (hasSufficientBalance && !currentRoleStatus) {
              try {
                await member.roles.add(
                  roleId,
                  "Verified token holder (periodic check)"
                );
                console.log(
                  `${userLogPrefix} Added role ${role.name} to ${member.user.tag}`
                );
                roleUpdates++;
                roleUpdatedThisCheck = true;
              } catch (roleAddError) {
                console.error(
                  `${userLogPrefix} Error adding role ${role.name} to ${member.user.tag}:`,
                  roleAddError
                );
              }
            } else if (!hasSufficientBalance && currentRoleStatus) {
              try {
                await member.roles.remove(
                  roleId,
                  "Token balance below threshold (periodic check)"
                );
                console.log(
                  `${userLogPrefix} Removed role ${role.name} from ${member.user.tag}`
                );
                roleUpdates++;
                roleUpdatedThisCheck = true;
              } catch (roleRemoveError) {
                console.error(
                  `${userLogPrefix} Error removing role ${role.name} from ${member.user.tag}:`,
                  roleRemoveError
                );
              }
            }
          } else if (holder.active !== hasSufficientBalance) {
            if (
              (hasSufficientBalance && !currentRoleStatus) ||
              (!hasSufficientBalance && currentRoleStatus)
            ) {
              console.warn(
                `${userLogPrefix} Role status needs update for ${member.user.tag} but bot lacks permissions/hierarchy.`
              );
            }
          }

          if (needsDbUpdate) {
            const updatePayload: any = {
              active: hasSufficientBalance
            };
            
            if (holder.username !== member.user.username) {
              updatePayload.username = member.user.username;
            }

            const success = await updateHolderData(
              holder.discord_user_id, 
              guildId, 
              updatePayload
            );

            if (!success) {
              console.error(
                `${userLogPrefix} Failed to update DB status for ${member.user.tag} to active=${hasSufficientBalance}`
              );
            } else {
              console.log(
                `${userLogPrefix} Updated DB status for ${member.user.tag} to active=${hasSufficientBalance}` +
                (updatePayload.username ? ` (Username also updated)` : "")
              );
              dbUpdates++;
            }
          }
        } catch (userError) {
          console.error(
            `${userLogPrefix} Error processing holder ${
              holder.username || holder.discord_user_id
            }:`,
            userError
          );
        }
      }
    }
  } catch (error) {
    console.error(
      `${logPrefix} Unhandled critical error during balance check:`,
      error
    );
  }
}