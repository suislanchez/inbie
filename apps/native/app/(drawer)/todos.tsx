import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
	ActivityIndicator,
	Alert,
	ScrollView,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from "react-native";

import { Container } from "@/components/container";
import { trpc } from "@/utils/trpc";

export default function TodosScreen() {
	const [newTodoText, setNewTodoText] = useState("");

	const todos = useQuery(trpc.todo.getAll.queryOptions());
	const createMutation = useMutation(
		trpc.todo.create.mutationOptions({
			onSuccess: () => {
				todos.refetch();
				setNewTodoText("");
			},
		}),
	);
	const toggleMutation = useMutation(
		trpc.todo.toggle.mutationOptions({
			onSuccess: () => {
				todos.refetch();
			},
		}),
	);
	const deleteMutation = useMutation(
		trpc.todo.delete.mutationOptions({
			onSuccess: () => {
				todos.refetch();
			},
		}),
	);

	const handleAddTodo = () => {
		if (newTodoText.trim()) {
			createMutation.mutate({ text: newTodoText });
		}
	};

	const handleToggleTodo = (id: number, completed: boolean) => {
		toggleMutation.mutate({ id, completed: !completed });
	};

	const handleDeleteTodo = (id: number) => {
		Alert.alert("Delete Todo", "Are you sure you want to delete this todo?", [
			{ text: "Cancel", style: "cancel" },
			{
				text: "Delete",
				style: "destructive",
				onPress: () => deleteMutation.mutate({ id }),
			},
		]);
	};

	return (
		<Container>
			<ScrollView className="flex-1">
				<View className="px-4 py-6">
					<View className="mb-6 rounded-lg border border-border bg-card p-4">
						<Text className="mb-2 font-bold text-2xl text-foreground">
							Todo List
						</Text>
						<Text className="mb-4 text-muted-foreground">
							Manage your tasks efficiently
						</Text>

						<View className="mb-6">
							<View className="mb-2 flex-row items-center space-x-2">
								<TextInput
									value={newTodoText}
									onChangeText={setNewTodoText}
									placeholder="Add a new task..."
									placeholderTextColor="#6b7280"
									editable={!createMutation.isPending}
									className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-foreground"
									onSubmitEditing={handleAddTodo}
									returnKeyType="done"
								/>
								<TouchableOpacity
									onPress={handleAddTodo}
									disabled={createMutation.isPending || !newTodoText.trim()}
									className={`rounded-md px-4 py-2 ${
										createMutation.isPending || !newTodoText.trim()
											? "bg-muted"
											: "bg-primary"
									}`}
								>
									{createMutation.isPending ? (
										<ActivityIndicator size="small" color="white" />
									) : (
										<Text className="font-medium text-white">Add</Text>
									)}
								</TouchableOpacity>
							</View>
						</View>

						{todos.isLoading ? (
							<View className="flex justify-center py-8">
								<ActivityIndicator size="large" color="#3b82f6" />
							</View>
						) : todos.data?.length === 0 ? (
							<Text className="py-8 text-center text-muted-foreground">
								No todos yet. Add one above!
							</Text>
						) : (
							<View className="space-y-2">
								{todos.data?.map((todo) => (
									<View
										key={todo.id}
										className="flex-row items-center justify-between rounded-md border border-border bg-background p-3"
									>
										<View className="flex-1 flex-row items-center">
											<TouchableOpacity
												onPress={() =>
													handleToggleTodo(todo.id, todo.completed)
												}
												className="mr-3"
											>
												<Ionicons
													name={todo.completed ? "checkbox" : "square-outline"}
													size={24}
													color={todo.completed ? "#22c55e" : "#6b7280"}
												/>
											</TouchableOpacity>
											<Text
												className={`flex-1 ${
													todo.completed
														? "text-muted-foreground line-through"
														: "text-foreground"
												}`}
											>
												{todo.text}
											</Text>
										</View>
										<TouchableOpacity
											onPress={() => handleDeleteTodo(todo.id)}
											className="ml-2 p-1"
										>
											<Ionicons
												name="trash-outline"
												size={20}
												color="#ef4444"
											/>
										</TouchableOpacity>
									</View>
								))}
							</View>
						)}
					</View>
				</View>
			</ScrollView>
		</Container>
	);
}
