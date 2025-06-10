import { Link } from "@tanstack/react-router";

import UserMenu from "@/components/user-menu";
import { ModeToggle } from "./mode-toggle";
import { useTheme } from "@/components/theme-provider";

export default function Header() {
	const { theme } = useTheme()
	const links = [
		{ to: "/", label: "Home" },
		{ to: "/dashboard", label: "Dashboard" },
		{ to: "/gmail", label: "Gmail" },
	];

	return (
		<div>
			<div className="flex flex-row items-center justify-between px-2 py-1">
				<nav className="flex gap-4 text-lg">
					{links.map(({ to, label }) => {
						return (
							<Link key={to} to={to}>
								{label}
							</Link>
						);
					})}
				</nav>
				<div className="flex items-center gap-2">
					<ModeToggle />
					<UserMenu />
				</div>
			</div>
			<hr />
		</div>
	);
}
