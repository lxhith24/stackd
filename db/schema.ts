import { sql } from 'drizzle-orm';
import { sqliteTable, text, integer, index, uniqueIndex } from 'drizzle-orm/sqlite-core';
export const profiles=sqliteTable('profiles',{owner:text('owner').primaryKey(),name:text('name').notNull(),currency:text('currency').notNull()});
export const sessions=sqliteTable('sessions',{
 id:text('id').primaryKey(),owner:text('owner').notNull().references(()=>profiles.owner),title:text('title').notNull(),mode:text('mode').notNull(),venue:text('venue').notNull(),game:text('game').notNull(),stakes:text('stakes').notNull(),notes:text('notes').notNull(),currency:text('currency').notNull(),start:text('start').notNull(),end:text('end'),status:text('status').notNull(),revision:integer('revision').notNull(),lastWrite:text('last_write').notNull(),inviteToken:text('invite_token'),
},t=>[index('idx_sessions_owner_start').on(t.owner,t.start),uniqueIndex('idx_invite_token').on(t.inviteToken),uniqueIndex('idx_sessions_one_active').on(t.owner).where(sql`${t.status} = 'active'`)]);
export const players=sqliteTable('players',{id:text('id').primaryKey(),sessionId:text('session_id').notNull().references(()=>sessions.id,{onDelete:'cascade'}),name:text('name').notNull(),isSelf:integer('is_self').notNull(),cashout:integer('cashout'),accountId:text('account_id')},t=>[index('idx_players_session').on(t.sessionId),uniqueIndex('idx_player_account').on(t.sessionId,t.accountId)]);
export const entries=sqliteTable('entries',{id:text('id').primaryKey(),sessionId:text('session_id').notNull().references(()=>sessions.id,{onDelete:'cascade'}),playerId:text('player_id').notNull().references(()=>players.id,{onDelete:'cascade'}),kind:text('kind').notNull(),amount:integer('amount').notNull(),at:text('at').notNull()},t=>[index('idx_entries_session').on(t.sessionId)]);

export const accounts=sqliteTable('accounts',{id:text('id').primaryKey(),name:text('name').notNull(),code:text('code').notNull().unique()});
export const friendships=sqliteTable('friendships',{id:text('id').primaryKey(),a:text('a').notNull(),b:text('b').notNull(),requestedBy:text('requested_by').notNull(),status:text('status').notNull()},t=>[uniqueIndex('idx_friend_pair').on(t.a,t.b)]);
export const socialLimits=sqliteTable('social_limits',{key:text('key').primaryKey(),count:integer('count').notNull(),window:integer('window').notNull()});
