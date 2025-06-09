import { Container } from "@/components/container";
import { useChat } from "@ai-sdk/react";
import { Ionicons } from "@expo/vector-icons";
import { fetch as expoFetch } from "expo/fetch";
import { useEffect, useRef } from "react";
import {
	KeyboardAvoidingView,
	Platform,
	ScrollView,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from "react-native";

// Utility function to generate API URLs
const generateAPIUrl = (relativePath: string) => {
	const serverUrl = process.env.EXPO_PUBLIC_SERVER_URL;
	if (!serverUrl) {
		throw new Error(
			"EXPO_PUBLIC_SERVER_URL environment variable is not defined",
		);
	}

	const path = relativePath.startsWith("/") ? relativePath : `/${relativePath}`;
	return serverUrl.concat(path);
};

export default function AIScreen() {
	const { messages, input, handleInputChange, handleSubmit, error } = useChat({
		fetch: expoFetch as unknown as typeof globalThis.fetch,
		api: generateAPIUrl("/ai"),
		onError: (error) => console.error(error, "AI Chat Error"),
		maxSteps: 5,
	});

	const scrollViewRef = useRef<ScrollView>(null);

	useEffect(() => {
		scrollViewRef.current?.scrollToEnd({ animated: true });
	}, [messages]);

	const onSubmit = () => {
		if (input.trim()) {
			handleSubmit();
		}
	};

	if (error) {
		return (
			<Container>
				<View className="flex-1 items-center justify-center px-4">
					<Text className="mb-4 text-center text-destructive text-lg">
						Error: {error.message}
					</Text>
					<Text className="text-center text-muted-foreground">
						Please check your connection and try again.
					</Text>
				</View>
			</Container>
		);
	}

	return (
		<Container>
			<KeyboardAvoidingView
				className="flex-1"
				behavior={Platform.OS === "ios" ? "padding" : "height"}
			>
				<View className="flex-1 px-4 py-6">
					<View className="mb-6">
						<Text className="mb-2 font-bold text-2xl text-foreground">
							AI Chat
						</Text>
						<Text className="text-muted-foreground">
							Chat with our AI assistant
						</Text>
					</View>

					<ScrollView
						ref={scrollViewRef}
						className="mb-4 flex-1"
						showsVerticalScrollIndicator={false}
					>
						{messages.length === 0 ? (
							<View className="flex-1 items-center justify-center">
								<Text className="text-center text-lg text-muted-foreground">
									Ask me anything to get started!
								</Text>
							</View>
						) : (
							<View className="space-y-4">
								{messages.map((message) => (
									<View
										key={message.id}
										className={`rounded-lg p-3 ${
											message.role === "user"
												? "ml-8 bg-primary/10"
												: "mr-8 border border-border bg-card"
										}`}
									>
										<Text className="mb-1 font-semibold text-foreground text-sm">
											{message.role === "user" ? "You" : "AI Assistant"}
										</Text>
										<Text className="text-foreground leading-relaxed">
											{message.content}
										</Text>
									</View>
								))}
							</View>
						)}
					</ScrollView>

					<View className="border-border border-t pt-4">
						<View className="flex-row items-end space-x-2">
							<TextInput
								value={input}
								onChange={(e) =>
									handleInputChange({
										...e,
										target: {
											...e.target,
											value: e.nativeEvent.text,
										},
									} as unknown as React.ChangeEvent<HTMLInputElement>)
								}
								placeholder="Type your message..."
								placeholderTextColor="#6b7280"
								className="max-h-[120px] min-h-[40px] flex-1 rounded-md border border-border bg-background px-3 py-2 text-foreground"
								onSubmitEditing={(e) => {
									handleSubmit(e);
									e.preventDefault();
								}}
								autoFocus={true}
							/>
							<TouchableOpacity
								onPress={onSubmit}
								disabled={!input.trim()}
								className={`rounded-md p-2 ${
									input.trim() ? "bg-primary" : "bg-muted"
								}`}
							>
								<Ionicons
									name="send"
									size={20}
									color={input.trim() ? "#ffffff" : "#6b7280"}
								/>
							</TouchableOpacity>
						</View>
					</View>
				</View>
			</KeyboardAvoidingView>
		</Container>
	);
}
