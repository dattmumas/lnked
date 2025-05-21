matthewdumas@Matthews-MacBook-Pro lnked % pnpm typecheck

> lnked-project@0.1.0 typecheck /Users/matthewdumas/lnked/lnked
> tsc --noEmit

.next/types/app/dashboard/[collectiveId]/new-post/page.ts:2:24 - error TS2307: Cannot find module '../../../../../../src/app/dashboard/[collectiveId]/new-post/page.js' or its corresponding type declarations.

2 import \* as entry from '../../../../../../src/app/dashboard/[collectiveId]/new-post/page.js'
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

.next/types/app/dashboard/[collectiveId]/new-post/page.ts:5:29 - error TS2307: Cannot find module '../../../../../../src/app/dashboard/[collectiveId]/new-post/page.js' or its corresponding type declarations.

5 type TEntry = typeof import('../../../../../../src/app/dashboard/[collectiveId]/new-post/page.js')
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

.next/types/app/dashboard/collectives/[collectiveId]/manage/members/page.ts:34:29 - error TS2344: Type '{ params: { collectiveId: string; }; }' does not satisfy the constraint 'PageProps'.
Types of property 'params' are incompatible.
Type '{ collectiveId: string; }' is missing the following properties from type 'Promise<any>': then, catch, finally, [Symbol.toStringTag]

34 checkFields<Diff<PageProps, FirstArg<TEntry['default']>, 'default'>>()
~~~~~~~~~~~~~~~~~~~~~~~~~~~

.next/types/app/dashboard/collectives/[collectiveId]/page.ts:34:29 - error TS2344: Type '{ params: { collectiveId: string; }; }' does not satisfy the constraint 'PageProps'.
Types of property 'params' are incompatible.
Type '{ collectiveId: string; }' is missing the following properties from type 'Promise<any>': then, catch, finally, [Symbol.toStringTag]

34 checkFields<Diff<PageProps, FirstArg<TEntry['default']>, 'default'>>()
~~~~~~~~~~~~~~~~~~~~~~~~~~~

.next/types/app/dashboard/collectives/[collectiveId]/settings/page.ts:34:29 - error TS2344: Type '{ params: { collectiveId: string; }; }' does not satisfy the constraint 'PageProps'.
Types of property 'params' are incompatible.
Type '{ collectiveId: string; }' is missing the following properties from type 'Promise<any>': then, catch, finally, [Symbol.toStringTag]

34 checkFields<Diff<PageProps, FirstArg<TEntry['default']>, 'default'>>()
~~~~~~~~~~~~~~~~~~~~~~~~~~~

.next/types/app/dashboard/collectives/[collectiveId]/subscribers/page.ts:34:29 - error TS2344: Type '{ params: { collectiveId: string; }; }' does not satisfy the constraint 'PageProps'.
Types of property 'params' are incompatible.
Type '{ collectiveId: string; }' is missing the following properties from type 'Promise<any>': then, catch, finally, [Symbol.toStringTag]

34 checkFields<Diff<PageProps, FirstArg<TEntry['default']>, 'default'>>()
~~~~~~~~~~~~~~~~~~~~~~~~~~~

.next/types/app/discover/page.ts:34:29 - error TS2344: Type '{ searchParams: { cursor?: string | undefined; }; }' does not satisfy the constraint 'PageProps'.
Types of property 'searchParams' are incompatible.
Type '{ cursor?: string | undefined; }' is missing the following properties from type 'Promise<any>': then, catch, finally, [Symbol.toStringTag]

34 checkFields<Diff<PageProps, FirstArg<TEntry['default']>, 'default'>>()
~~~~~~~~~~~~~~~~~~~~~~~~~~~

.next/types/app/invite/[inviteCode]/page.ts:34:29 - error TS2344: Type '{ params: { inviteCode: string; }; }' does not satisfy the constraint 'PageProps'.
Types of property 'params' are incompatible.
Type '{ inviteCode: string; }' is missing the following properties from type 'Promise<any>': then, catch, finally, [Symbol.toStringTag]

34 checkFields<Diff<PageProps, FirstArg<TEntry['default']>, 'default'>>()
~~~~~~~~~~~~~~~~~~~~~~~~~~~

.next/types/app/posts/[postId]/edit/page.ts:2:24 - error TS2307: Cannot find module '../../../../../../src/app/posts/[postId]/edit/page.js' or its corresponding type declarations.

2 import \* as entry from '../../../../../../src/app/posts/[postId]/edit/page.js'
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

.next/types/app/posts/[postId]/edit/page.ts:5:29 - error TS2307: Cannot find module '../../../../../../src/app/posts/[postId]/edit/page.js' or its corresponding type declarations.

5 type TEntry = typeof import('../../../../../../src/app/posts/[postId]/edit/page.js')
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

.next/types/app/posts/new/page.ts:2:24 - error TS2307: Cannot find module '../../../../../src/app/posts/new/page.js' or its corresponding type declarations.

2 import \* as entry from '../../../../../src/app/posts/new/page.js'
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

.next/types/app/posts/new/page.ts:5:29 - error TS2307: Cannot find module '../../../../../src/app/posts/new/page.js' or its corresponding type declarations.

5 type TEntry = typeof import('../../../../../src/app/posts/new/page.js')
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

.next/types/app/users/[userId]/page.ts:34:29 - error TS2344: Type '{ params: { userId: string; }; }' does not satisfy the constraint 'PageProps'.
Types of property 'params' are incompatible.
Type '{ userId: string; }' is missing the following properties from type 'Promise<any>': then, catch, finally, [Symbol.toStringTag]

34 checkFields<Diff<PageProps, FirstArg<TEntry['default']>, 'default'>>()
~~~~~~~~~~~~~~~~~~~~~~~~~~~

src/app/(auth)/sign-in/page.tsx:5:10 - error TS2305: Module '"next/navigation"' has no exported member 'useRouter'.

5 import { useRouter } from "next/navigation";
~~~~~~~~~

src/app/(auth)/sign-up/page.tsx:5:10 - error TS2305: Module '"next/navigation"' has no exported member 'useRouter'.

5 import { useRouter } from "next/navigation";
~~~~~~~~~

src/app/(editor)/posts/[postId]/edit/EditPostForm.tsx:3:10 - error TS2305: Module '"next/navigation"' has no exported member 'useRouter'.

3 import { useRouter } from "next/navigation";
~~~~~~~~~

src/app/(editor)/posts/[postId]/edit/page.tsx:2:10 - error TS2305: Module '"next/navigation"' has no exported member 'notFound'.

2 import { notFound, redirect } from "next/navigation";
~~~~~~~~

src/app/(editor)/posts/new/NewPostForm.tsx:180:29 - error TS2345: Argument of type 'string | number | symbol' is not assignable to parameter of type 'string'.
Type 'number' is not assignable to type 'string'.

180 form.setError(field as keyof NewPostFormValues, {
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

src/app/(editor)/posts/new/page.tsx:4:10 - error TS2305: Module '"next/navigation"' has no exported member 'notFound'.

4 import { notFound } from "next/navigation";
~~~~~~~~

src/app/[collectiveSlug]/[postId]/page.tsx:3:10 - error TS2305: Module '"next/navigation"' has no exported member 'notFound'.

3 import { notFound } from 'next/navigation';
~~~~~~~~

src/app/actions/collectiveActions.ts:126:5 - error TS2353: Object literal may only specify known properties, and 'user_id' does not exist in type '{ collective_id: string; created_at?: string | undefined; id?: string | undefined; member_id: string; member_type?: "collective" | "user" | undefined; role?: "admin" | "editor" | "author" | "owner" | undefined; share_percentage?: number | ... 1 more ... | undefined; updated_at?: string | undefined; }'.

126 user_id: inviteeUser.id,
~~~~~~~

src/app/api/posts/\_postId/comments/route.ts:11:28 - error TS2304: Cannot find name 'getCommentsByPostId'.

11 const comments = await getCommentsByPostId(postId);
~~~~~~~~~~~~~~~~~~~

src/app/api/stripe-webhook/route.ts:6:10 - error TS2305: Module '"next/headers"' has no exported member 'headers'.

6 import { headers } from 'next/headers';
~~~~~~~

src/app/api/stripe-webhook/route.ts:161:34 - error TS2339: Property 'current_period_start' does not exist on type 'Subscription'.

161 subscriptionObject.current_period_start \* 1000,
~~~~~~~~~~~~~~~~~~~~

src/app/api/stripe-webhook/route.ts:164:34 - error TS2339: Property 'current_period_end' does not exist on type 'Subscription'.

164 subscriptionObject.current_period_end \* 1000,
~~~~~~~~~~~~~~~~~~

src/app/dashboard/collectives/[collectiveId]/manage/members/ManageMembersClientUI.tsx:4:10 - error TS2305: Module '"next/navigation"' has no exported member 'useRouter'.

4 import { useRouter } from "next/navigation";
~~~~~~~~~

src/app/dashboard/collectives/[collectiveId]/settings/EditCollectiveSettingsForm.tsx:4:10 - error TS2305: Module '"next/navigation"' has no exported member 'useRouter'.

4 import { useRouter } from "next/navigation";
~~~~~~~~~

src/app/dashboard/collectives/[collectiveId]/settings/EditCollectiveSettingsForm.tsx:339:12 - error TS2304: Cannot find name 'isOwner'.

339 {isOwner && (
~~~~~~~

src/app/dashboard/collectives/[collectiveId]/settings/EditCollectiveSettingsForm.tsx:376:12 - error TS2304: Cannot find name 'isOwner'.

376 {isOwner && eligibleMembers.length > 0 && (
~~~~~~~

src/app/dashboard/collectives/[collectiveId]/settings/page.tsx:65:14 - error TS7006: Parameter 'u' implicitly has an 'any' type.

65 .filter((u) => u && u.id !== authUser.id);
~

src/app/dashboard/collectives/new/NewCollectiveForm.tsx:4:10 - error TS2305: Module '"next/navigation"' has no exported member 'useRouter'.

4 import { useRouter } from "next/navigation";
~~~~~~~~~

src/app/layout.tsx:8:10 - error TS2305: Module '"next/headers"' has no exported member 'headers'.

8 import { headers } from 'next/headers';
~~~~~~~

src/app/newsletters/[userId]/page.tsx:3:10 - error TS2305: Module '"next/navigation"' has no exported member 'notFound'.

3 import { notFound } from "next/navigation";
~~~~~~~~

src/app/posts/[postId]/page.tsx:3:10 - error TS2305: Module '"next/navigation"' has no exported member 'notFound'.

3 import { notFound } from 'next/navigation';
~~~~~~~~

src/app/posts/[postId]/page.tsx:44:8 - error TS18047: 'typedPost' is possibly 'null'.

44 if (!typedPost.author) {
~~~~~~~~~

src/app/posts/[postId]/page.tsx:51:20 - error TS18047: 'typedPost' is possibly 'null'.

51 const isPublic = typedPost.is_public;
~~~~~~~~~

src/app/posts/[postId]/page.tsx:53:6 - error TS18047: 'typedPost' is possibly 'null'.

53 !typedPost.published_at || new Date(typedPost.published_at) <= new Date();
~~~~~~~~~

src/app/posts/[postId]/page.tsx:53:41 - error TS18047: 'typedPost' is possibly 'null'.

53 !typedPost.published_at || new Date(typedPost.published_at) <= new Date();
~~~~~~~~~

src/app/posts/[postId]/page.tsx:54:40 - error TS18047: 'typedPost' is possibly 'null'.

54 const isAuthor = currentUser?.id === typedPost.author_id;
~~~~~~~~~

src/components/app/auth/AuthForm.tsx:15:10 - error TS2305: Module '"next/navigation"' has no exported member 'useRouter'.

15 import { useRouter } from "next/navigation";
~~~~~~~~~

src/components/app/dashboard/organisms/DashboardNav.tsx:117:13 - error TS2322: Type '{ children: Element[]; side: string; className: string; }' is not assignable to type 'IntrinsicAttributes & DialogContentProps & RefAttributes<HTMLDivElement>'.
Property 'side' does not exist on type 'IntrinsicAttributes & DialogContentProps & RefAttributes<HTMLDivElement>'.

117 side="left"
~~~~

src/components/app/dashboard/posts/PostListItem.tsx:9:10 - error TS2305: Module '"next/navigation"' has no exported member 'useRouter'.

9 import { useRouter } from "next/navigation";
~~~~~~~~~

src/components/app/newsletters/molecules/SubscribeButton.tsx:7:23 - error TS2305: Module '"next/navigation"' has no exported member 'useRouter'.

7 import { usePathname, useRouter } from "next/navigation";
~~~~~~~~~

src/components/app/newsletters/molecules/SubscribeButton.tsx:27:50 - error TS2709: Cannot use namespace 'User' as a type.

27 const [currentUser, setCurrentUser] = useState<User | null>(null);
~~~~

src/components/app/profile/ProfileFeed.tsx:55:15 - error TS2322: Type '{ contentType: ContentType; author_id: string; collective_id: string | null; content: string | null; created_at: string; dislike_count: number | null; id: string; is_public: boolean; ... 7 more ...; collective_slug?: string | null; }' is not assignable to type 'PostWithLikes'.
Type '{ contentType: ContentType; author_id: string; collective_id: string | null; content: string | null; created_at: string; dislike_count: number | null; id: string; is_public: boolean; ... 7 more ...; collective_slug?: string | null; }' is not assignable to type '{ like_count?: number | undefined; current_user_has_liked?: boolean | undefined; }'.
Types of property 'current_user_has_liked' are incompatible.
Type 'boolean | null | undefined' is not assignable to type 'boolean | undefined'.
Type 'null' is not assignable to type 'boolean | undefined'.

55 post={pinned}
~~~~

src/components/app/posts/molecules/PostCard.tsx:22:3
22 post: PostWithLikes;
~~~~
The expected type comes from property 'post' which is declared here on type 'IntrinsicAttributes & PostCardProps'

src/components/app/profile/ProfileFeed.tsx:64:15 - error TS2322: Type '{ contentType: ContentType; author_id: string; collective_id: string | null; content: string | null; created_at: string; dislike_count: number | null; id: string; is_public: boolean; ... 7 more ...; collective_slug?: string | null; }' is not assignable to type 'PostWithLikes'.
Type '{ contentType: ContentType; author_id: string; collective_id: string | null; content: string | null; created_at: string; dislike_count: number | null; id: string; is_public: boolean; ... 7 more ...; collective_slug?: string | null; }' is not assignable to type '{ like_count?: number | undefined; current_user_has_liked?: boolean | undefined; }'.
Types of property 'current_user_has_liked' are incompatible.
Type 'boolean | null | undefined' is not assignable to type 'boolean | undefined'.
Type 'null' is not assignable to type 'boolean | undefined'.

64 post={post}
~~~~

src/components/app/posts/molecules/PostCard.tsx:22:3
22 post: PostWithLikes;
~~~~
The expected type comes from property 'post' which is declared here on type 'IntrinsicAttributes & PostCardProps'

src/components/app/settings/DeleteAccountSection.tsx:6:10 - error TS2305: Module '"next/navigation"' has no exported member 'useRouter'.

6 import { useRouter } from "next/navigation";
~~~~~~~~~

src/components/editor/nodes/ExcalidrawNode.tsx:97:39 - error TS2345: Argument of type 'undefined' is not assignable to parameter of type 'Record<string, unknown> | (() => Record<string, unknown>)'.

97 useState<Record<string, unknown>>(undefined);
~~~~~~~~~

src/components/editor/nodes/ExcalidrawNode.tsx:107:23 - error TS2345: Argument of type 'undefined' is not assignable to parameter of type 'SetStateAction<Record<string, unknown>>'.

107 setParsedData(undefined);
~~~~~~~~~

src/components/editor/nodes/ExcalidrawNode.tsx:148:11 - error TS2322: Type '{ ref: RefObject<ExcalidrawImperativeAPI | null>; initialData: Record<string, unknown>; onChange: (elements: readonly unknown[], appState: unknown, files: unknown) => void; viewModeEnabled: false; zenModeEnabled: false; gridModeEnabled: false; theme: "light"; }' is not assignable to type 'IntrinsicAttributes & ExcalidrawProps'.
Property 'ref' does not exist on type 'IntrinsicAttributes & ExcalidrawProps'.

148 ref={excalidrawRef}
~~~

src/components/editor/plugins/SlashMenuPlugin.tsx:186:11 - error TS2531: Object is possibly 'null'.

186 $getSelection().isCollapsed()
~~~~~~~~~~~~~~~

src/components/editor/plugins/SlashMenuPlugin.tsx:190:36 - error TS2339: Property 'anchor' does not exist on type 'BaseSelection'.

190 const anchor = selection.anchor;
~~~~~~

src/components/FollowButton.tsx:9:10 - error TS2305: Module '"next/navigation"' has no exported member 'useRouter'.

9 import { useRouter, usePathname } from "next/navigation";
~~~~~~~~~

src/components/Navbar.tsx:4:23 - error TS2305: Module '"next/navigation"' has no exported member 'useRouter'.

4 import { usePathname, useRouter } from "next/navigation";
~~~~~~~~~

src/components/Navbar.tsx:7:15 - error TS2300: Duplicate identifier 'User'.

7 import type { User, Session } from "@supabase/supabase-js";
~~~~

src/components/Navbar.tsx:21:3 - error TS2300: Duplicate identifier 'User'.

21 User,
~~~~

src/components/Navbar.tsx:59:36 - error TS2709: Cannot use namespace 'User' as a type.

59 const [user, setUser] = useState<User | null>(null);
~~~~

src/components/Navbar.tsx:64:51 - error TS7031: Binding element 'currentUser' implicitly has an 'any' type.

64 supabase.auth.getUser().then(({ data: { user: currentUser } }) => {
~~~~~~~~~~~

src/components/Navbar.tsx:70:32 - error TS2709: Cannot use namespace 'Session' as a type.

70 (event: string, session: Session | null) => {
~~~~~~~

src/components/Navbar.tsx:216:24 - error TS1361: 'User' cannot be used as a value because it was imported using 'import type'.

216 <User className="size-4 mr-2" /> My Profile
~~~~

src/components/Navbar.tsx:7:15
7 import type { User, Session } from "@supabase/supabase-js";
~~~~
'User' was imported here.

src/components/Navbar.tsx:275:24 - error TS1361: 'User' cannot be used as a value because it was imported using 'import type'.

275 <User className="size-4 mr-2" /> My Profile
~~~~

src/components/Navbar.tsx:7:15
7 import type { User, Session } from "@supabase/supabase-js";
~~~~
'User' was imported here.

src/components/ui/LexicalRenderer.tsx:23:5 - error TS2322: Type 'object' is not assignable to type 'Record<string, unknown>'.
Index signature for type 'string' is missing in type '{}'.

23 contentObj = contentJSON;
~~~~~~~~~~

src/components/ui/LexicalRenderer.tsx:127:32 - error TS2352: Conversion of type 'LexicalNode' to type '{ format: number; }' may be a mistake because neither type sufficiently overlaps with the other. If this was intentional, convert the expression to 'unknown' first.
Property 'format' is missing in type 'LexicalNode' but required in type '{ format: number; }'.

127 const formatFlags = (node as { format: number }).format;
~~~~~~~~~~~~~~~~~~~~~~~~~~

src/components/ui/LexicalRenderer.tsx:127:42
127 const formatFlags = (node as { format: number }).format;
~~~~~~
'format' is declared here.

src/components/ui/LexicalRenderer.tsx:159:22 - error TS2352: Conversion of type 'LexicalNode' to type '{ src: string; }' may be a mistake because neither type sufficiently overlaps with the other. If this was intentional, convert the expression to 'unknown' first.
Property 'src' is missing in type 'LexicalNode' but required in type '{ src: string; }'.

159 const src = (node as { src: string }).src;
~~~~~~~~~~~~~~~~~~~~~~~

src/components/ui/LexicalRenderer.tsx:159:32
159 const src = (node as { src: string }).src;
~~~
'src' is declared here.

src/components/ui/LexicalRenderer.tsx:174:22 - error TS2352: Conversion of type 'LexicalNode' to type '{ src: string; }' may be a mistake because neither type sufficiently overlaps with the other. If this was intentional, convert the expression to 'unknown' first.
Property 'src' is missing in type 'LexicalNode' but required in type '{ src: string; }'.

174 const src = (node as { src: string }).src;
~~~~~~~~~~~~~~~~~~~~~~~

src/components/ui/LexicalRenderer.tsx:174:32
174 const src = (node as { src: string }).src;
~~~
'src' is declared here.

src/components/ui/LexicalRenderer.tsx:189:22 - error TS2352: Conversion of type 'LexicalNode' to type '{ url: string; }' may be a mistake because neither type sufficiently overlaps with the other. If this was intentional, convert the expression to 'unknown' first.
Property 'url' is missing in type 'LexicalNode' but required in type '{ url: string; }'.

189 const src = (node as { url: string }).url;
~~~~~~~~~~~~~~~~~~~~~~~

src/components/ui/LexicalRenderer.tsx:189:32
189 const src = (node as { url: string }).url;
~~~
'url' is declared here.

src/components/ui/LexicalRenderer.tsx:204:35 - error TS2352: Conversion of type 'LexicalNode' to type '{ tweetUrl: string; }' may be a mistake because neither type sufficiently overlaps with the other. If this was intentional, convert the expression to 'unknown' first.
Property 'tweetUrl' is missing in type 'LexicalNode' but required in type '{ tweetUrl: string; }'.

204 const tweetUrl: string = (node as { tweetUrl: string }).tweetUrl;
~~~~~~~~~~~~~~~~~~~~~~~~~~~~

src/components/ui/LexicalRenderer.tsx:204:45
204 const tweetUrl: string = (node as { tweetUrl: string }).tweetUrl;
~~~~~~~~
'tweetUrl' is declared here.

src/components/ui/LexicalRenderer.tsx:216:35 - error TS2352: Conversion of type 'LexicalNode' to type '{ videoUrl: string; }' may be a mistake because neither type sufficiently overlaps with the other. If this was intentional, convert the expression to 'unknown' first.
Property 'videoUrl' is missing in type 'LexicalNode' but required in type '{ videoUrl: string; }'.

216 const videoUrl: string = (node as { videoUrl: string }).videoUrl;
~~~~~~~~~~~~~~~~~~~~~~~~~~~~

src/components/ui/LexicalRenderer.tsx:216:45
216 const videoUrl: string = (node as { videoUrl: string }).videoUrl;
~~~~~~~~
'videoUrl' is declared here.

src/components/ui/LexicalRenderer.tsx:318:38 - error TS2339: Property 'children' does not exist on type '{}'.

318 {Array.isArray(contentObj.root.children)
~~~~~~~~

src/components/ui/LexicalRenderer.tsx:319:27 - error TS2339: Property 'children' does not exist on type '{}'.

319 ? contentObj.root.children.map((child: LexicalNode, idx: number) => (
~~~~~~~~

src/lib/hooks/useSupabaseRealtime.tsx:37:10 - error TS7006: Parameter 'payload' implicitly has an 'any' type.

37 (payload) => {
~~~~~~~

src/lib/stripe.ts:15:5 - error TS2322: Type '"2023-10-16"' is not assignable to type '"2025-04-30.basil"'.

15 apiVersion: '2023-10-16',
~~~~~~~~~~

src/lib/supabase/browser.ts:5:48 - error TS2709: Cannot use namespace 'SupabaseClient' as a type.

5 export const createSupabaseBrowserClient = (): SupabaseClient<Database> =>
~~~~~~~~~~~~~~

src/lib/supabaseAdmin.ts:17:29 - error TS2709: Cannot use namespace 'SupabaseClient' as a type.

17 export const supabaseAdmin: SupabaseClient<Database> = createClient<Database>(
~~~~~~~~~~~~~~

src/lib/supabaseAdmin.ts:17:56 - error TS2347: Untyped function calls may not accept type arguments.

17 export const supabaseAdmin: SupabaseClient<Database> = createClient<Database>(
~~~~~~~~~~~~~~~~~~~~~~~
18 process.env.NEXT_PUBLIC_SUPABASE_URL!,
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
...
25 }
~~~
26 );
~

Found 75 errors in 42 files.

Errors Files
2 .next/types/app/dashboard/[collectiveId]/new-post/page.ts:2
1 .next/types/app/dashboard/collectives/[collectiveId]/manage/members/page.ts:34
1 .next/types/app/dashboard/collectives/[collectiveId]/page.ts:34
1 .next/types/app/dashboard/collectives/[collectiveId]/settings/page.ts:34
1 .next/types/app/dashboard/collectives/[collectiveId]/subscribers/page.ts:34
1 .next/types/app/discover/page.ts:34
1 .next/types/app/invite/[inviteCode]/page.ts:34
2 .next/types/app/posts/[postId]/edit/page.ts:2
2 .next/types/app/posts/new/page.ts:2
1 .next/types/app/users/[userId]/page.ts:34
1 src/app/(auth)/sign-in/page.tsx:5
1 src/app/(auth)/sign-up/page.tsx:5
1 src/app/(editor)/posts/[postId]/edit/EditPostForm.tsx:3
1 src/app/(editor)/posts/[postId]/edit/page.tsx:2
1 src/app/(editor)/posts/new/NewPostForm.tsx:180
1 src/app/(editor)/posts/new/page.tsx:4
1 src/app/[collectiveSlug]/[postId]/page.tsx:3
1 src/app/actions/collectiveActions.ts:126
1 src/app/api/posts/\_postId/comments/route.ts:11
3 src/app/api/stripe-webhook/route.ts:6
1 src/app/dashboard/collectives/[collectiveId]/manage/members/ManageMembersClientUI.tsx:4
3 src/app/dashboard/collectives/[collectiveId]/settings/EditCollectiveSettingsForm.tsx:4
1 src/app/dashboard/collectives/[collectiveId]/settings/page.tsx:65
1 src/app/dashboard/collectives/new/NewCollectiveForm.tsx:4
1 src/app/layout.tsx:8
1 src/app/newsletters/[userId]/page.tsx:3
6 src/app/posts/[postId]/page.tsx:3
1 src/components/app/auth/AuthForm.tsx:15
1 src/components/app/dashboard/organisms/DashboardNav.tsx:117
1 src/components/app/dashboard/posts/PostListItem.tsx:9
2 src/components/app/newsletters/molecules/SubscribeButton.tsx:7
2 src/components/app/profile/ProfileFeed.tsx:55
1 src/components/app/settings/DeleteAccountSection.tsx:6
3 src/components/editor/nodes/ExcalidrawNode.tsx:97
2 src/components/editor/plugins/SlashMenuPlugin.tsx:186
1 src/components/FollowButton.tsx:9
8 src/components/Navbar.tsx:4
9 src/components/ui/LexicalRenderer.tsx:23
1 src/lib/hooks/useSupabaseRealtime.tsx:37
1 src/lib/stripe.ts:15
1 src/lib/supabase/browser.ts:5
2 src/lib/supabaseAdmin.ts:17
